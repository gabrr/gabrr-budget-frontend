"use client";

import {
  ImportTimeline,
  type ImportTimelineJob,
  type ImportTimelineStatementKind,
  type ImportTimelineStatus,
} from "@/components/ledger/import-timeline";
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
  Text,
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
  const [watchingJobId, setWatchingJobId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
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
    [loadTransactionsForJob],
  );

  useEffect(() => {
    isMountedRef.current = true;
    void loadJobs();

    return () => {
      isMountedRef.current = false;
      eventSourceRef.current?.close();
    };
  }, [loadJobs]);

  useEffect(() => {
    void loadTransactionsForJob(selectedJobId);
  }, [loadTransactionsForJob, selectedJobId]);

  const updateJob = (update: ImportJobEvent) => {
    setJobs((currentJobs) =>
      currentJobs.map((job) => (job.job_id === update.job_id ? update : job)),
    );
  };

  const watchProcess = (job: ImportJobEvent) => {
    if (!isActiveJob(job)) return;

    eventSourceRef.current?.close();
    setWatchingJobId(job.job_id);

    const events = new EventSource(`${API_BASE_URL}${job.events_url}`);
    eventSourceRef.current = events;

    events.addEventListener("progress", (event) => {
      const update = JSON.parse(event.data) as ImportJobEvent;
      if (!isMountedRef.current) return;
      updateJob(update);

      if (!isActiveJob(update)) {
        events.close();
        eventSourceRef.current = null;
        setWatchingJobId(null);

        if (selectedJobIdRef.current === update.job_id) {
          void loadTransactionsForJob(update.job_id);
        }
      }
    });

    events.addEventListener("error", () => {
      events.close();
      eventSourceRef.current = null;
      setWatchingJobId(null);
      void fetchImportJob(job.status_url)
        .then((update) => {
          if (!isMountedRef.current) return;
          updateJob(update);
          if (selectedJobIdRef.current === update.job_id && !isActiveJob(update)) {
            void loadTransactionsForJob(update.job_id);
          }
        })
        .catch(() => undefined);
    });
  };

  const selectedJob =
    jobs.find((job) => job.job_id === selectedJobId) ?? null;
  const timelineJobs = jobs.map(toTimelineJob);
  const selectedJobIsActive = selectedJob !== null && isActiveJob(selectedJob);

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
          <Stack gap="2">
            <Heading as="h1" textStyle="pageTitle">
              Processes
            </Heading>
            <Text textStyle="subtitle">
              Review imported statements and draft transactions.
            </Text>
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
          <Stack
            as="section"
            aria-label="Import timeline"
            gap="4"
            gridColumn={{ lg: "span 1" }}
            layerStyle="panel"
            minW="0"
          >
            <Stack gap="1">
              <Heading as="h2" textStyle="panelTitle">
                Import timeline
              </Heading>
              <Text color="text.secondary" fontSize="13px" lineHeight="1.4">
                Select a statement import to review its draft transactions.
              </Text>
            </Stack>

            <ImportTimeline
              jobs={timelineJobs}
              selectedJobId={selectedJobId ?? undefined}
              onSelectJob={setSelectedJobId}
              isLoading={isJobsLoading}
              emptyLabel="No statement imports yet."
            />
          </Stack>

          <Stack
            as="section"
            aria-label="Selected import transactions"
            gap="4"
            gridColumn={{ lg: "span 2" }}
            layerStyle="panel"
            minW="0"
          >
            <SelectedImportHeader
              isWatching={watchingJobId === selectedJobId}
              job={selectedJob}
              onWatch={
                selectedJob && selectedJobIsActive
                  ? () => watchProcess(selectedJob)
                  : undefined
              }
              transactionCount={transactions.length}
              transactionsTotal={transactionsTotal}
            />

            <TransactionList
              transactions={transactions}
              isLoading={isTransactionsLoading}
              emptyLabel={
                selectedJobId
                  ? "No draft transactions for this import yet."
                  : "Select an import to review transactions."
              }
            />
          </Stack>
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

function SelectedImportHeader({
  isWatching,
  job,
  onWatch,
  transactionCount,
  transactionsTotal,
}: {
  isWatching: boolean;
  job: ImportJobEvent | null;
  onWatch?: () => void;
  transactionCount: number;
  transactionsTotal: number;
}) {
  const title = job?.original_filename || "No import selected";
  const metadata = job
    ? `${statementKindLabel(job.statement_kind)} · ${job.current_step || job.status}`
    : "Select an import from the timeline.";

  return (
    <Flex
      align={{ base: "stretch", md: "flex-start" }}
      direction={{ base: "column", md: "row" }}
      gap="3"
      justify="space-between"
    >
      <Stack gap="2" minW="0">
        <Text
          color="text.tertiary"
          fontSize="10px"
          fontWeight="820"
          letterSpacing="0.08em"
          textTransform="uppercase"
        >
          Selected file
        </Text>
        <Heading
          as="h2"
          color="text.primary"
          fontSize={{ base: "18px", md: "20px" }}
          fontWeight="780"
          letterSpacing="0"
          lineHeight="1.15"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {title}
        </Heading>
        <Text color="text.secondary" fontSize="13px" lineHeight="1.4">
          {metadata}
        </Text>
        <Flex color="text.tertiary" fontSize="12px" fontWeight="720" gap="2">
          <Text as="span">{transactionsTotal} total</Text>
          <Text as="span">·</Text>
          <Text as="span">{transactionCount} shown</Text>
        </Flex>
      </Stack>

      {onWatch ? (
        <Button
          alignSelf={{ base: "flex-start", md: "center" }}
          disabled={isWatching}
          minH="32px"
          px="12px"
          type="button"
          variant="outline"
          onClick={onWatch}
        >
          {isWatching ? "Watching" : "Watch"}
        </Button>
      ) : null}
    </Flex>
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

function statementKindLabel(value: string) {
  if (value === "checking_account") return "Checking account";
  if (value === "credit_card") return "Credit card";

  return "Unknown statement";
}
