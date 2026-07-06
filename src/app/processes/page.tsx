"use client";

import {
  ImportTimeline,
  type ImportTimelineJob,
  type ImportTimelineStatementKind,
  type ImportTimelineStatus,
} from "@/components/ledger/import-timeline";
import { SectionCard } from "@/components/ui/section-card";
import {
  TransactionList,
  type TransactionClassificationSource,
  type TransactionListItem,
  type TransactionNature,
} from "@/components/ledger/transaction-list";
import {
  bucketChipValues,
  categoryChipValues,
  type BucketChipValue,
  type CategoryChipValue,
} from "@/components/chips";
import {
  API_BASE_URL,
  fetchImportJob,
  fetchImportJobs,
  type ImportJobEvent,
} from "@/services/import";
import {
  fetchTransactions,
  type Transaction,
} from "@/services/wealth";
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  Stack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const timelineStatuses = new Set<ImportTimelineStatus>([
  "pending",
  "processing",
  "done",
  "failed",
]);
const statementKinds = new Set<ImportTimelineStatementKind>([
  "checking_account",
  "credit_card",
  "unknown",
]);
const classificationSources = new Set<TransactionClassificationSource>([
  "agent",
  "system",
  "user",
]);
const transactionNatures = new Set<TransactionNature>([
  "income",
  "expense",
  "transfer",
  "refund",
  "card_payment",
  "unknown",
]);
const bucketValues = new Set<string>(bucketChipValues);
const categoryValues = new Set<string>(categoryChipValues);

function isActiveJob(job: ImportJobEvent): boolean {
  return job.status === "pending" || job.status === "processing";
}

function mostRecentJob(jobs: ImportJobEvent[]) {
  return jobs.reduce<ImportJobEvent | null>((current, job) => {
    if (current === null) return job;

    const currentTime = Date.parse(current.created_at);
    const nextTime = Date.parse(job.created_at);

    return (Number.isNaN(nextTime) ? 0 : nextTime) >
      (Number.isNaN(currentTime) ? 0 : currentTime)
      ? job
      : current;
  }, null);
}

function resolveSelectedJobId(jobs: ImportJobEvent[], currentJobId: string | null) {
  if (currentJobId && jobs.some((job) => job.job_id === currentJobId)) {
    return currentJobId;
  }

  return mostRecentJob(jobs)?.job_id ?? null;
}

export default function ProcessesPage() {
  const [jobs, setJobs] = useState<ImportJobEvent[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [isJobsLoading, setIsJobsLoading] = useState(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const isMountedRef = useRef(false);
  const selectedJobIdRef = useRef<string | null>(null);
  const transactionsRequestRef = useRef(0);

  useEffect(() => {
    selectedJobIdRef.current = selectedJobId;
  }, [selectedJobId]);

  const loadTransactionsForJob = useCallback(async (jobId: string | null) => {
    const requestId = transactionsRequestRef.current + 1;
    transactionsRequestRef.current = requestId;

    if (jobId === null) {
      setTransactions([]);
      setTransactionsTotal(0);
      setIsTransactionsLoading(false);
      return;
    }

    setIsTransactionsLoading(true);
    try {
      const response = await fetchTransactions({
        importJobId: jobId,
        isDraft: true,
        limit: 200,
      });

      if (!isMountedRef.current || requestId !== transactionsRequestRef.current) {
        return;
      }

      setTransactions(response.items.map(toTransactionListItem));
      setTransactionsTotal(response.total);
    } catch (error) {
      if (!isMountedRef.current || requestId !== transactionsRequestRef.current) {
        return;
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load transactions for this import",
      );
    } finally {
      if (isMountedRef.current && requestId === transactionsRequestRef.current) {
        setIsTransactionsLoading(false);
      }
    }
  }, []);

  const updateJob = useCallback((update: ImportJobEvent) => {
    setJobs((currentJobs) => {
      const hasJob = currentJobs.some((job) => job.job_id === update.job_id);
      if (!hasJob) return [update, ...currentJobs];

      return currentJobs.map((job) =>
        job.job_id === update.job_id ? update : job,
      );
    });
  }, []);

  const closeJobWatch = useCallback((jobId: string) => {
    const eventSource = eventSourcesRef.current.get(jobId);
    if (!eventSource) return;

    eventSource.close();
    eventSourcesRef.current.delete(jobId);
  }, []);

  const closeInactiveWatches = useCallback((nextJobs: ImportJobEvent[]) => {
    const activeJobIds = new Set(
      nextJobs.filter(isActiveJob).map((job) => job.job_id),
    );

    for (const [jobId, eventSource] of eventSourcesRef.current) {
      if (!activeJobIds.has(jobId)) {
        eventSource.close();
        eventSourcesRef.current.delete(jobId);
      }
    }
  }, []);

  const handleTerminalJob = useCallback(
    (update: ImportJobEvent) => {
      if (isActiveJob(update)) return;

      closeJobWatch(update.job_id);

      if (selectedJobIdRef.current === update.job_id) {
        void loadTransactionsForJob(update.job_id);
      }
    },
    [closeJobWatch, loadTransactionsForJob],
  );

  const watchJob = useCallback(
    (job: ImportJobEvent) => {
      if (!isActiveJob(job) || eventSourcesRef.current.has(job.job_id)) {
        return;
      }

      const events = new EventSource(`${API_BASE_URL}${job.events_url}`);
      eventSourcesRef.current.set(job.job_id, events);

      events.addEventListener("progress", (event) => {
        const update = JSON.parse(event.data) as ImportJobEvent;
        if (!isMountedRef.current) return;

        updateJob(update);
        handleTerminalJob(update);
      });

      events.addEventListener("error", () => {
        closeJobWatch(job.job_id);

        void fetchImportJob(job.status_url)
          .then((update) => {
            if (!isMountedRef.current) return;

            updateJob(update);
            handleTerminalJob(update);
          })
          .catch(() => undefined);
      });
    },
    [closeJobWatch, handleTerminalJob, updateJob],
  );

  const watchActiveJobs = useCallback(
    (nextJobs: ImportJobEvent[]) => {
      closeInactiveWatches(nextJobs);
      nextJobs.forEach(watchJob);
    },
    [closeInactiveWatches, watchJob],
  );

  const loadJobs = useCallback(
    async ({ refreshTransactions = false } = {}) => {
      setIsJobsLoading(true);
      setMessage(null);
      try {
        const nextJobs = await fetchImportJobs(20);
        if (!isMountedRef.current) return;

        const nextSelectedJobId = resolveSelectedJobId(
          nextJobs,
          selectedJobIdRef.current,
        );
        const selectedChanged = nextSelectedJobId !== selectedJobIdRef.current;

        setJobs(nextJobs);
        setSelectedJobId(nextSelectedJobId);
        watchActiveJobs(nextJobs);

        if (refreshTransactions && !selectedChanged) {
          void loadTransactionsForJob(nextSelectedJobId);
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        setMessage(error instanceof Error ? error.message : "Could not load jobs");
      } finally {
        if (isMountedRef.current) setIsJobsLoading(false);
      }
    },
    [loadTransactionsForJob, watchActiveJobs],
  );

  useEffect(() => {
    const eventSources = eventSourcesRef.current;

    isMountedRef.current = true;
    void loadJobs();

    return () => {
      isMountedRef.current = false;
      eventSources.forEach((eventSource) => eventSource.close());
      eventSources.clear();
    };
  }, [loadJobs]);

  useEffect(() => {
    void loadTransactionsForJob(selectedJobId);
  }, [loadTransactionsForJob, selectedJobId]);

  const selectedJob =
    jobs.find((job) => job.job_id === selectedJobId) ?? null;
  const timelineJobs = jobs.map(toTimelineJob);

  return (
    <Box as="main" layerStyle="page">
      <Container maxW="1480px" px={{ base: "4", md: "8", lg: "10" }} py="8">
        <Flex
          as="header"
          align={{ base: "stretch", md: "flex-end" }}
          direction={{ base: "column", md: "row" }}
          gap="6"
          justify="space-between"
          pb="6"
        >
          <Stack gap="0">
            <Heading as="h1" textStyle="pageTitle">
              Processes
            </Heading>
          </Stack>

          <Flex flexWrap="wrap" gap="3" justify={{ md: "flex-end" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadJobs({ refreshTransactions: true })}
            >
              Refresh
            </Button>
            <Button asChild variant="outline">
              <NextLink href="/dashboard">Dashboard</NextLink>
            </Button>
          </Flex>
        </Flex>

        <Grid
          alignItems="start"
          gap={{ base: "4", lg: "5" }}
          gridTemplateColumns={{ base: "1fr", lg: "repeat(3, minmax(0, 1fr))" }}
          minW="0"
        >
          <Box as="section" aria-label="Import timeline" gridColumn={{ lg: "span 1" }} minW="0">
            <SectionCard
              title="Import timeline"
              subtitle="Select a statement import to review its draft transactions."
            >
              <ImportTimeline
                jobs={timelineJobs}
                selectedJobId={selectedJobId ?? undefined}
                onSelectJob={setSelectedJobId}
                isLoading={isJobsLoading}
                emptyLabel="No statement imports yet."
                variant="embedded"
              />
            </SectionCard>
          </Box>

          <Box
            as="section"
            aria-label="Selected import transactions"
            gridColumn={{ lg: "span 2" }}
            minW="0"
          >
            <SectionCard
              eyebrow="Selected file"
              title={selectedJob?.original_filename || "No import selected"}
              meta={`${transactionsTotal} total · ${transactions.length} shown`}
            >
              <TransactionList
                transactions={transactions}
                isLoading={isTransactionsLoading}
                emptyLabel={
                  selectedJobId
                    ? "No draft transactions for this import yet."
                    : "Select an import to review transactions."
                }
              />
            </SectionCard>
          </Box>
        </Grid>

        {message && (
          <Box layerStyle="inlineBanner" mt="4" maxW="720px" role="alert">
            {message}
          </Box>
        )}
      </Container>
    </Box>
  );
}

function toTimelineJob(job: ImportJobEvent): ImportTimelineJob {
  return {
    ...job,
    error_message: job.error_message ?? null,
    status: toTimelineStatus(job.status),
    statement_kind: toStatementKind(job.statement_kind),
    statement_kind_confidence: job.statement_kind_confidence,
  };
}

function toTransactionListItem(transaction: Transaction): TransactionListItem {
  return {
    id: transaction.id,
    import_job_id: transaction.import_job_id,
    posted_at: transaction.posted_at,
    date: transaction.date,
    description: transaction.description,
    merchant_name: transaction.merchant_name,
    merchant: transaction.merchant ?? null,
    amount: transaction.amount,
    currency: transaction.currency,
    category: toCategoryValue(transaction.category),
    report_bucket: toBucketValue(transaction.report_bucket),
    classification_source: toClassificationSource(transaction.classification_source),
    classification_confidence: transaction.classification_confidence,
    classification_reason: transaction.classification_reason,
    is_draft: transaction.is_draft,
    transaction_nature: toTransactionNature(transaction.transaction_nature),
  };
}

function toTimelineStatus(value: string): ImportTimelineStatus {
  return timelineStatuses.has(value as ImportTimelineStatus)
    ? (value as ImportTimelineStatus)
    : "pending";
}

function toStatementKind(value: string): ImportTimelineStatementKind {
  return statementKinds.has(value as ImportTimelineStatementKind)
    ? (value as ImportTimelineStatementKind)
    : "unknown";
}

function toClassificationSource(value: string): TransactionClassificationSource {
  return classificationSources.has(value as TransactionClassificationSource)
    ? (value as TransactionClassificationSource)
    : "system";
}

function toTransactionNature(value: string): TransactionNature {
  return transactionNatures.has(value as TransactionNature)
    ? (value as TransactionNature)
    : "unknown";
}

function toBucketValue(value: string): BucketChipValue {
  return bucketValues.has(value) ? (value as BucketChipValue) : "unknown";
}

function toCategoryValue(value: string | null): CategoryChipValue | null {
  if (value === null) return null;

  return categoryValues.has(value) ? (value as CategoryChipValue) : null;
}
