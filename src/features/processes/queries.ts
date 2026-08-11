import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { dashboardQueryKeys } from "@/features/dashboard/queries";

import {
  deleteImportJob,
  getImportJobs,
  getTransactions,
  patchTransaction,
  ProcessApiError,
  uploadStatement,
} from "./api";
import type {
  ImportJob,
  Transaction,
  TransactionPatch,
  TransactionsCollection,
  TransactionsParams,
} from "./types";

const SERVER_PAGE_SIZE = 200;

export const processKeys = {
  all: ["processes"] as const,
  imports: (limit: number) => [...processKeys.all, "imports", { limit }] as const,
  transactions: (importJobId: string) =>
    [...processKeys.all, "transactions", { importJobId }] as const,
};

function isLive(job: ImportJob) {
  return job.status === "pending" || job.status === "processing";
}

function retryTransient(failureCount: number, error: Error) {
  if (error instanceof ProcessApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

function invalidateImportedData(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: [...processKeys.all, "transactions"],
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.reports(),
    }),
  ]);
}

export function useImportJobs(limit = 50) {
  const queryClient = useQueryClient();
  const priorStatuses = useRef(new Map<string, string>());
  const query = useQuery({
    queryKey: processKeys.imports(limit),
    queryFn: ({ signal }) => getImportJobs(limit, signal),
    staleTime: 10_000,
    retry: retryTransient,
    refetchInterval: (query) =>
      query.state.data?.some(isLive) ? 1_500 : false,
  });

  useEffect(() => {
    if (!query.data) return;
    const nextStatuses = new Map(query.data.map((job) => [job.job_id, job.status]));
    const becameReady = query.data.some((job) => {
      const previous = priorStatuses.current.get(job.job_id);
      return job.status === "done" &&
        (previous === "pending" || previous === "processing");
    });
    priorStatuses.current = nextStatuses;
    if (becameReady) {
      void invalidateImportedData(queryClient);
    }
  }, [query.data, queryClient]);

  return query;
}

function postedAtTimestamp(transaction: Transaction) {
  if (!transaction.posted_at) return null;
  const timestamp = Date.parse(transaction.posted_at);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function compareTransactions(left: Transaction, right: Transaction) {
  const leftTimestamp = postedAtTimestamp(left);
  const rightTimestamp = postedAtTimestamp(right);
  if (leftTimestamp === null && rightTimestamp !== null) return 1;
  if (leftTimestamp !== null && rightTimestamp === null) return -1;
  if (leftTimestamp !== null && rightTimestamp !== null && leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }
  return left.id.localeCompare(right.id);
}

export async function loadImportTransactions(
  importJobId: string,
  signal?: AbortSignal,
): Promise<TransactionsCollection> {
  const loadState = async (isDraft: boolean) => {
    const items: Transaction[] = [];
    for (let offset = 0; ; offset += SERVER_PAGE_SIZE) {
      const page = await getTransactions({
        importJobId,
        isDraft,
        limit: SERVER_PAGE_SIZE,
        offset,
      }, signal);
      items.push(...page.items);
      if (
        page.items.length === 0 ||
        page.items.length < SERVER_PAGE_SIZE ||
        offset + page.items.length >= page.total
      ) {
        break;
      }
    }
    return items;
  };

  const [drafts, approved] = await Promise.all([
    loadState(true),
    loadState(false),
  ]);
  const items = [...new Map(
    [...drafts, ...approved].map((transaction) => [transaction.id, transaction]),
  ).values()].sort(compareTransactions);
  return { items, total: items.length };
}

export function useTransactions(importJobId: string | null) {
  return useQuery({
    queryKey: importJobId
      ? processKeys.transactions(importJobId)
      : [...processKeys.all, "transactions", "disabled"],
    queryFn: ({ signal }) => {
      if (!importJobId) throw new Error("A selected import is required");
      return loadImportTransactions(importJobId, signal);
    },
    enabled: importJobId !== null,
    staleTime: 30_000,
    retry: retryTransient,
  });
}

export function useDeleteImportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => deleteImportJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.setQueriesData<ImportJob[]>(
        { queryKey: [...processKeys.all, "imports"] },
        (current) => current?.filter((job) => job.job_id !== jobId),
      );
      queryClient.removeQueries({
        queryKey: processKeys.transactions(jobId),
      });
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...processKeys.all, "imports"],
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.reports(),
        }),
      ]);
    },
  });
}

type PatchVariables = {
  jobId: string;
  transactionId: string;
  patch: TransactionPatch;
};

export function usePatchTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, patch }: PatchVariables) =>
      patchTransaction(transactionId, patch),
    onSuccess: async (updated, variables) => {
      updateTransactionCaches(queryClient, variables.jobId, updated);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...processKeys.all, "transactions"],
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.reports(),
        }),
      ]);
    },
    onError: (error) => {
      if (error instanceof ProcessApiError && error.status === 404) {
        void queryClient.invalidateQueries({
          queryKey: [...processKeys.all, "transactions"],
        });
      }
    },
  });
}

function updateTransactionCaches(
  queryClient: QueryClient,
  jobId: string,
  updated: Transaction,
) {
  const cached = queryClient.getQueriesData<TransactionsCollection>({
    queryKey: [...processKeys.all, "transactions"],
  });

  cached.forEach(([queryKey, response]) => {
    const identity = queryKey[2];
    if (!response || !isTransactionIdentity(identity) || identity.importJobId !== jobId) {
      return;
    }
    const containsUpdated = response.items.some((item) => item.id === updated.id);
    if (!containsUpdated) return;

    queryClient.setQueryData<TransactionsCollection>(queryKey, {
      ...response,
      items: response.items.map((item) => item.id === updated.id ? updated : item),
    });
  });
}

function isTransactionIdentity(value: unknown): value is Pick<TransactionsParams, "importJobId"> {
  return Boolean(
    value &&
    typeof value === "object" &&
    "importJobId" in value,
  );
}

function putAcceptedJob(queryClient: QueryClient, accepted: ImportJob) {
  queryClient.setQueryData<ImportJob[]>(processKeys.imports(50), (current = []) => [
    accepted,
    ...current.filter((job) => job.job_id !== accepted.job_id),
  ].slice(0, 50));
}

export function useUploadStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, idempotencyKey }: { file: File; idempotencyKey: string }) =>
      uploadStatement(file, idempotencyKey),
    onSuccess: (accepted) => {
      putAcceptedJob(queryClient, accepted);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: processKeys.imports(50) }),
        invalidateImportedData(queryClient),
      ]);
    },
  });
}
