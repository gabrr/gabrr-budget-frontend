"use client";

import { Box, Container, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import {
  BucketChip,
  CategoryChip,
  ConfidenceChip,
  bucketChipValues,
  categoryChipValues,
} from "@/components/chips";
import {
  ImportTimeline,
  type ImportTimelineJob,
} from "@/components/ledger/import-timeline";
import {
  TransactionList,
  type TransactionListItem,
} from "@/components/ledger/transaction-list";

const confidenceSamples = [0.86, 0.62, 0.42];
const mockImportJobs = [
  {
    job_id: "job_e35554178e58",
    status: "done",
    current_step: "Draft transactions saved",
    error_message: null,
    original_filename: "Extrato-01-03-2026-a-31-03-2026-PDF.pdf",
    statement_kind: "checking_account",
    statement_kind_confidence: "1.0000",
    status_url: "/import-jobs/job_e35554178e58",
    events_url: "/import-jobs/job_e35554178e58/events",
    created_at: "2026-05-29T07:25:59.788948-03:00",
    updated_at: "2026-05-29T07:27:36.041481-03:00",
    started_at: "2026-05-29T04:26:01.151628-03:00",
    finished_at: "2026-05-29T04:27:36.041141-03:00",
  },
  {
    job_id: "job_inter_april",
    status: "processing",
    current_step: "Classifying statement transactions",
    error_message: null,
    original_filename: "inter-april-2026.pdf",
    statement_kind: "credit_card",
    statement_kind_confidence: "0.9400",
    status_url: "/import-jobs/job_inter_april",
    events_url: "/import-jobs/job_inter_april/events",
    created_at: "2026-04-30T21:04:00-03:00",
    updated_at: "2026-04-30T21:06:12-03:00",
    started_at: "2026-04-30T21:04:10-03:00",
    finished_at: null,
  },
  {
    job_id: "job_itau_preview",
    status: "pending",
    current_step: "Upload received",
    error_message: null,
    original_filename: "itau-june-preview.pdf",
    statement_kind: "unknown",
    statement_kind_confidence: null,
    status_url: "/import-jobs/job_itau_preview",
    events_url: "/import-jobs/job_itau_preview/events",
    created_at: "2026-06-08T09:18:00-03:00",
    updated_at: "2026-06-08T09:18:00-03:00",
    started_at: null,
    finished_at: null,
  },
  {
    job_id: "job_nubank_march",
    status: "failed",
    current_step: "Failed",
    error_message: "Could not read statement table.",
    original_filename: "nubank-marco.pdf",
    statement_kind: "unknown",
    statement_kind_confidence: null,
    status_url: "/import-jobs/job_nubank_march",
    events_url: "/import-jobs/job_nubank_march/events",
    created_at: "2026-04-02T09:12:00-03:00",
    updated_at: "2026-04-02T09:14:10-03:00",
    started_at: "2026-04-02T09:12:05-03:00",
    finished_at: "2026-04-02T09:14:10-03:00",
  },
] satisfies ImportTimelineJob[];

const mockTransactions = [
  {
    id: "tx_sweetgreen",
    import_job_id: "job_inter_april",
    posted_at: "2026-04-30",
    date: "2026-04-30",
    description: "Lunch near office",
    merchant_name: "Sweetgreen",
    merchant: "Sweetgreen",
    amount: "-42.80",
    currency: "USD",
    category: "food",
    report_bucket: "living_cost",
    classification_source: "agent",
    classification_confidence: "0.86",
    classification_reason:
      "Bucket set to living_cost because this merchant matches prior lunch transactions and is not recurring.",
    is_draft: true,
    transaction_nature: "expense",
  },
  {
    id: "tx_uber",
    import_job_id: "job_inter_april",
    posted_at: "2026-04-30",
    date: "2026-04-30",
    description: "Airport ride",
    merchant_name: "Uber",
    merchant: "Uber",
    amount: "-31.20",
    currency: "USD",
    category: "transportation",
    report_bucket: "living_cost",
    classification_source: "system",
    classification_confidence: 0.62,
    classification_reason:
      "Bucket set to living_cost because ride-share charges are variable transportation expenses and match the saved Uber rule.",
    is_draft: true,
    transaction_nature: "expense",
  },
  {
    id: "tx_pix",
    import_job_id: "job_inter_april",
    posted_at: "2026-04-29",
    date: "2026-04-29",
    description: "Statement text: PIX ENVIADO GABRIEL",
    merchant_name: "Unknown PIX Transfer",
    merchant: null,
    amount: "-180.00",
    currency: "USD",
    category: "others",
    report_bucket: "unknown",
    classification_source: "agent",
    classification_confidence: "0.42",
    classification_reason:
      "Bucket is unknown because the PIX descriptor does not match a saved merchant rule, recurring pattern, or known transfer relationship.",
    is_draft: true,
    transaction_nature: "transfer",
  },
  {
    id: "tx_netflix",
    import_job_id: "job_inter_april",
    posted_at: "2026-04-28",
    date: "2026-04-28",
    description: "Monthly streaming subscription",
    merchant_name: "Netflix",
    merchant: "Netflix",
    amount: "-19.90",
    currency: "USD",
    category: "leisure",
    report_bucket: "fixed_cost",
    classification_source: "system",
    classification_confidence: "0.94",
    classification_reason:
      "Bucket set to fixed_cost because Netflix repeats monthly with a stable amount and matches an existing subscription rule.",
    is_draft: true,
    transaction_nature: "expense",
  },
  {
    id: "tx_payroll",
    import_job_id: "job_inter_april",
    posted_at: "2026-04-28",
    date: "2026-04-28",
    description: "Monthly salary deposit",
    merchant_name: "Acme Payroll",
    merchant: "Acme Payroll",
    amount: "4500.00",
    currency: "USD",
    category: "company",
    report_bucket: "income",
    classification_source: "user",
    classification_confidence: "0.98",
    classification_reason:
      "Bucket set to income because the transaction is a recurring payroll deposit from a recognized employer.",
    is_draft: true,
    transaction_nature: "income",
  },
  {
    id: "tx_missing",
    import_job_id: "job_inter_april",
    posted_at: null,
    date: null,
    description: null,
    merchant_name: null,
    merchant: null,
    amount: null,
    currency: "USD",
    category: null,
    report_bucket: "excluded",
    classification_source: "system",
    classification_confidence: null,
    classification_reason: null,
    is_draft: true,
    transaction_nature: "unknown",
  },
] satisfies TransactionListItem[];

export default function CatalogPage() {
  const [selectedJobId, setSelectedJobId] = useState("job_e35554178e58");
  const [focusedArea, setFocusedArea] = useState<"timeline" | "transactions" | null>(null);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [focusedTransactionId, setFocusedTransactionId] = useState<string | null>(null);
  const transactions = mockTransactions;

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
      const currentIndex = mockImportJobs.findIndex((job) => job.job_id === focusedJobId);
      if (event.key === "ArrowDown") focusTimeline(currentIndex + 1);
      if (event.key === "ArrowUp") focusTimeline(currentIndex - 1);
      if (event.key === "ArrowRight") {
        if (focusedJobId) setSelectedJobId(focusedJobId);
        focusTransaction(0);
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
      focusTimeline(mockImportJobs.findIndex((job) => job.job_id === selectedJobId));
    }
  }

  function focusTimeline(index: number) {
    const job = mockImportJobs[clamp(index, 0, mockImportJobs.length - 1)];
    setFocusedArea("timeline");
    setFocusedJobId(job.job_id);
    setFocusedTransactionId(null);
    focusImportJobButton(job.job_id);
  }

  function focusTransaction(index: number) {
    const transaction = transactions[clamp(index, 0, transactions.length - 1)];
    if (!transaction) return;

    setFocusedArea("transactions");
    setFocusedJobId(null);
    setFocusedTransactionId(transaction.id);
    focusTransactionButton(transaction.id);
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <Box
      as="main"
      layerStyle="page"
      minH="100vh"
    >
      <Container maxW="1180px" px={{ base: "5", md: "8" }} py={{ base: "6", md: "8" }}>
        <Stack gap={{ base: "5", md: "6" }}>
          <Flex
            align={{ base: "flex-start", md: "flex-end" }}
            direction={{ base: "column", md: "row" }}
            gap="4"
            justify="space-between"
          >
            <Stack gap="2">
              <Heading
                as="h1"
                textStyle="pageTitle"
              >
                Transaction chip catalog
              </Heading>
              <Text textStyle="subtitle" maxW="720px">
                Category, bucket, and confidence chips for transaction review.
              </Text>
            </Stack>

            <Box
              bg="bg.surface"
              borderColor="border.subtle"
              borderRadius="999px"
              borderWidth="1px"
              color="text.secondary"
              fontSize="12px"
              fontWeight="720"
              minH="34px"
              px="12px"
              py="7px"
              whiteSpace="nowrap"
            >
              presentation components
            </Box>
          </Flex>

          <CatalogPanel title="Categories">
            <ChipWrap>
              {categoryChipValues.map((value) => (
                <CategoryChip key={value} value={value} />
              ))}
            </ChipWrap>
          </CatalogPanel>

          <CatalogPanel title="Buckets">
            <ChipWrap>
              {bucketChipValues.map((value) => (
                <BucketChip key={value} value={value} />
              ))}
            </ChipWrap>
          </CatalogPanel>

          <CatalogPanel title="Confidence">
            <ChipWrap>
              {confidenceSamples.map((value) => (
                <ConfidenceChip key={value} value={value} />
              ))}
            </ChipWrap>
          </CatalogPanel>

          <CatalogPanel title="Clickable">
            <ChipWrap>
              <CategoryChip value="transportation" onClick={() => console.log("transportation")} />
              <BucketChip value="unknown" onClick={() => console.log("unknown")} />
              <ConfidenceChip value={0.42} onClick={() => console.log("low confidence")} />
            </ChipWrap>
          </CatalogPanel>

          <CatalogPanel title="Import Timeline">
            <ImportTimeline
              jobs={mockImportJobs}
              selectedJobId={selectedJobId}
              onSelectJob={(jobId) => {
                setFocusedArea("timeline");
                setFocusedJobId(jobId);
                setFocusedTransactionId(null);
                setSelectedJobId(jobId);
              }}
            />
          </CatalogPanel>

          <CatalogPanel title="Import Timeline States">
            <Stack gap="4">
              <ImportTimeline jobs={[]} emptyLabel="No statement imports yet." />
              <ImportTimeline jobs={mockImportJobs} isLoading />
            </Stack>
          </CatalogPanel>

          <CatalogPanel title="Transaction List">
            <TransactionList
              defaultOpenTransactionId="tx_sweetgreen"
              transactions={transactions}
            />
          </CatalogPanel>

          <CatalogPanel title="Transaction List States">
            <Stack gap="4">
              <TransactionList
                transactions={[]}
                emptyLabel="No draft transactions for this import yet."
              />
              <TransactionList transactions={mockTransactions} isLoading />
            </Stack>
          </CatalogPanel>
        </Stack>
      </Container>
    </Box>
  );
}

function CatalogPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <Stack
      as="section"
      bg="bg.surface"
      borderColor="border.subtle"
      borderRadius="18px"
      borderWidth="1px"
      gap="4"
      p={{ base: "4", md: "5" }}
    >
      <Heading as="h2" textStyle="panelTitle">
        {title}
      </Heading>
      {children}
    </Stack>
  );
}

function ChipWrap({ children }: { children: ReactNode }) {
  return (
    <Flex align="center" gap="5px" wrap="wrap">
      {children}
    </Flex>
  );
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
