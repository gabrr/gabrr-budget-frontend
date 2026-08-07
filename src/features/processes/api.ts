import { authenticatedFetch } from "@/services/api";

import type {
  ImportJob,
  Transaction,
  TransactionPatch,
  TransactionsParams,
  TransactionsResponse,
} from "./types";

export class ProcessApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ProcessApiError";
  }
}

async function responseError(response: Response, fallback: string) {
  const body = await response.text().catch(() => "");
  if (!body) return fallback;

  try {
    const parsed = JSON.parse(body) as { detail?: string; message?: string };
    return parsed.detail || parsed.message || fallback;
  } catch {
    return body;
  }
}

export async function getImportJobs(
  limit: number,
  signal?: AbortSignal,
): Promise<ImportJob[]> {
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  const response = await authenticatedFetch(`/import-jobs?limit=${boundedLimit}`, {
    signal,
  });

  if (!response.ok) {
    throw new ProcessApiError(
      await responseError(response, `Could not load imports (${response.status})`),
      response.status,
    );
  }

  return response.json() as Promise<ImportJob[]>;
}

export async function getTransactions(
  params: TransactionsParams,
  signal?: AbortSignal,
): Promise<TransactionsResponse> {
  const search = new URLSearchParams({
    import_job_id: params.importJobId,
    is_draft: String(params.isDraft),
    limit: String(params.limit),
    offset: String(params.offset),
  });
  const response = await authenticatedFetch(`/transactions?${search.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new ProcessApiError(
      await responseError(
        response,
        `Could not load transactions (${response.status})`,
      ),
      response.status,
    );
  }

  return response.json() as Promise<TransactionsResponse>;
}

export async function uploadStatement(
  file: File,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<ImportJob> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await authenticatedFetch("/agents/process-file", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: formData,
    signal,
  });

  if (!response.ok) {
    throw new ProcessApiError(
      await responseError(response, `Could not add statement (${response.status})`),
      response.status,
    );
  }

  return response.json() as Promise<ImportJob>;
}

export async function patchTransaction(
  transactionId: string,
  patch: TransactionPatch,
  signal?: AbortSignal,
): Promise<Transaction> {
  const response = await authenticatedFetch(`/transactions/${transactionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    signal,
  });

  if (!response.ok) {
    throw new ProcessApiError(
      await responseError(
        response,
        `Could not update transaction (${response.status})`,
      ),
      response.status,
    );
  }

  return response.json() as Promise<Transaction>;
}
