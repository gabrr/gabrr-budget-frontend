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
  Flex,
  Heading,
  Stack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

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
  const [transactionsJobId, setTransactionsJobId] = useState<string | null>(null);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [isJobsLoading, setIsJobsLoading] = useState(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [focusedArea, setFocusedArea] = useState<"timeline" | "transactions" | null>(null);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [focusedTransactionId, setFocusedTransactionId] = useState<string | null>(null);
  const [pendingTransactionFocusJobId, setPendingTransactionFocusJobId] =
    useState<string | null>(null);
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
      setTransactionsJobId(null);
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
      setTransactionsJobId(jobId);
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

  function handleKeyDown(
    event: ReactKeyboardEvent<HTMLElement> | globalThis.KeyboardEvent,
  ) {
    if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(event.key)) {
      if (event.key === "Enter" && focusedArea === "timeline" && focusedJobId) {
        event.preventDefault();
        setSelectedJobId(focusedJobId);
      }
      return;
    }

    event.preventDefault();

    if (focusedArea === null) {
      focusTimeline(0);
      return;
    }

    if (focusedArea === "timeline") {
      const currentIndex = timelineJobs.findIndex((job) => job.job_id === focusedJobId);
      if (event.key === "ArrowDown") focusTimeline(currentIndex + 1);
      if (event.key === "ArrowUp") focusTimeline(currentIndex - 1);
      if (event.key === "ArrowRight" && focusedJobId) {
        setSelectedJobId(focusedJobId);
        setPendingTransactionFocusJobId(focusedJobId);
      }
      return;
    }

    if (!focusedTransactionId) {
      focusTransaction(0);
      return;
    }

    const nextTransactionId = focusAdjacentTransaction(
      focusedTransactionId,
      toTransactionDirection(event.key),
    );

    if (nextTransactionId) {
      setFocusedArea("transactions");
      setFocusedJobId(null);
      setFocusedTransactionId(nextTransactionId);
      return;
    }

    if (event.key === "ArrowLeft") {
      focusTimeline(timelineJobs.findIndex((job) => job.job_id === selectedJobId));
    }
  }

  function focusTimeline(index: number) {
    if (timelineJobs.length === 0) return;

    const job = timelineJobs[clamp(index, 0, timelineJobs.length - 1)];
    setFocusedArea("timeline");
    setFocusedJobId(job.job_id);
    setFocusedTransactionId(null);
    focusImportJobButton(job.job_id);
  }

  const focusTransaction = useCallback((index: number) => {
    const transaction = transactions[clamp(index, 0, transactions.length - 1)];
    if (!transaction) return;

    setFocusedArea("transactions");
    setFocusedJobId(null);
    setFocusedTransactionId(transaction.id);
    focusTransactionButton(transaction.id);
  }, [transactions]);

  useEffect(() => {
    if (
      pendingTransactionFocusJobId === null ||
      pendingTransactionFocusJobId !== selectedJobId ||
      transactionsJobId !== pendingTransactionFocusJobId ||
      isTransactionsLoading ||
      transactions.length === 0
    ) {
      return;
    }

    focusTransaction(0);
    setPendingTransactionFocusJobId(null);
  }, [
    focusTransaction,
    isTransactionsLoading,
    pendingTransactionFocusJobId,
    selectedJobId,
    transactionsJobId,
    transactions.length,
  ]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <Box as="main" layerStyle="page">
      <Box
        as="section"
        aria-label="Import timeline"
        left={{ lg: "24px" }}
        maxW={{ base: "none", lg: "440px" }}
        position={{ base: "static", lg: "fixed" }}
        px={{ base: "4", md: "8", lg: "0" }}
        py={{ base: "4", md: "6", lg: "0" }}
        top={{ lg: "24px" }}
        w={{ base: "100%", lg: "440px" }}
        zIndex={{ lg: "docked" }}
      >
        <SectionCard
          bodyOverflowY={{ lg: "auto" }}
          bodyPb={{ lg: "24px" }}
          bodyPr={{ lg: "29px" }}
          bodyPt={{ lg: "24px" }}
          h={{ lg: "calc(100vh - 48px)" }}
          title="Import timeline"
          subtitle="Select a statement import to review its draft transactions."
        >
          <ImportTimeline
            jobs={timelineJobs}
            selectedJobId={selectedJobId ?? undefined}
            onSelectJob={(jobId) => {
              setFocusedArea("timeline");
              setFocusedJobId(jobId);
              setFocusedTransactionId(null);
              setSelectedJobId(jobId);
            }}
            isLoading={isJobsLoading}
            emptyLabel="No statement imports yet."
            variant="embedded"
          />
        </SectionCard>
      </Box>

      <Box
        ml={{ base: "0", lg: "464px" }}
        minH="100vh"
        minW="0"
        p={{ base: "4", md: "6" }}
      >
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

        <Box as="section" aria-label="Selected import transactions" minW="0">
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
              variant="grid"
            />
          </SectionCard>
        </Box>

        {message && (
          <Box layerStyle="inlineBanner" mt="4" maxW="720px" role="alert">
            {message}
          </Box>
        )}
      </Box>
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function focusImportJobButton(jobId: string) {
  focusBySelector(`[data-import-job-id="${jobId}"]`);
}

function focusTransactionButton(transactionId: string) {
  focusBySelector(`[data-transaction-button-id="${transactionId}"]`);
}

type TransactionDirection = "up" | "down" | "left" | "right";

function toTransactionDirection(key: string): TransactionDirection {
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  if (key === "ArrowLeft") return "left";
  return "right";
}

function focusAdjacentTransaction(
  currentTransactionId: string,
  direction: TransactionDirection,
) {
  const current = getVisibleElement(
    `[data-transaction-button-id="${currentTransactionId}"]`,
  );
  if (!current) return null;

  const currentRect = current.getBoundingClientRect();
  const currentCenter = rectCenter(currentRect);
  const candidates = getVisibleElements("[data-transaction-button-id]")
    .filter((element) => element !== current)
    .map((element) => ({
      element,
      id: element.dataset.transactionButtonId,
      rect: element.getBoundingClientRect(),
    }))
    .filter((candidate) => candidate.id);

  const directionalCandidates = candidates.filter(({ rect }) => {
    const center = rectCenter(rect);
    if (direction === "up") return center.y < currentCenter.y - 1;
    if (direction === "down") return center.y > currentCenter.y + 1;
    if (direction === "left") {
      return center.x < currentCenter.x - 1 && verticalOverlap(currentRect, rect) > 0;
    }
    return center.x > currentCenter.x + 1 && verticalOverlap(currentRect, rect) > 0;
  });

  const next = directionalCandidates.toSorted((a, b) => {
    const scoreA = transactionDirectionScore(direction, currentRect, a.rect);
    const scoreB = transactionDirectionScore(direction, currentRect, b.rect);
    return scoreA - scoreB;
  })[0];

  if (!next?.id) return null;

  focusTransactionButton(next.id);
  return next.id;
}

function transactionDirectionScore(
  direction: TransactionDirection,
  currentRect: DOMRect,
  candidateRect: DOMRect,
) {
  const currentCenter = rectCenter(currentRect);
  const candidateCenter = rectCenter(candidateRect);
  const deltaX = Math.abs(candidateCenter.x - currentCenter.x);
  const deltaY = Math.abs(candidateCenter.y - currentCenter.y);

  if (direction === "up" || direction === "down") {
    return deltaY + deltaX * 4;
  }

  return deltaX + deltaY * 4;
}

function rectCenter(rect: DOMRect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function verticalOverlap(a: DOMRect, b: DOMRect) {
  return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

function focusBySelector(selector: string) {
  window.requestAnimationFrame(() => {
    const element =
      getVisibleElement(selector) ?? document.querySelector<HTMLElement>(selector);
    element?.focus();
    element?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

function getVisibleElement(selector: string) {
  return getVisibleElements(selector)[0] ?? null;
}

function getVisibleElements(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
    isVisibleElement,
  );
}

function isVisibleElement(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    element.getClientRects().length > 0
  );
}
