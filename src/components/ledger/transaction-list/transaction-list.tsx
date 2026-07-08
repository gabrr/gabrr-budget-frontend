"use client";

import { Box, Flex, Grid, Stack, Text } from "@chakra-ui/react";
import { Children, useState } from "react";
import type { ReactNode } from "react";
import { BucketChip, CategoryChip, ConfidenceChip } from "@/components/chips";
import type { BucketChipValue } from "@/components/chips";
import type {
  TransactionClassificationSource,
  TransactionListItem,
} from "./types";

export type TransactionListProps = {
  transactions: TransactionListItem[];
  defaultOpenTransactionId?: string;
  openTransactionId?: string;
  onOpenChange?: (transactionId: string | null) => void;
  isLoading?: boolean;
  emptyLabel?: string;
  variant?: "stack" | "grid";
};

const sourceLabels: Record<TransactionClassificationSource, string> = {
  agent: "AI suggested",
  system: "System rule",
  user: "User reviewed",
};

const bucketLabels: Record<BucketChipValue, string> = {
  income: "Income",
  debt_installment: "Debt installment",
  fixed_cost: "Fixed cost",
  living_cost: "Living cost",
  excluded: "Excluded",
  unknown: "Unknown",
};

export function TransactionList({
  transactions,
  defaultOpenTransactionId,
  openTransactionId,
  onOpenChange,
  isLoading = false,
  emptyLabel = "No draft transactions yet.",
  variant = "stack",
}: TransactionListProps) {
  const [uncontrolledOpenId, setUncontrolledOpenId] = useState<string | null>(
    defaultOpenTransactionId ?? null,
  );
  const currentOpenId = openTransactionId ?? uncontrolledOpenId;

  function setOpenId(transactionId: string | null) {
    if (openTransactionId === undefined) {
      setUncontrolledOpenId(transactionId);
    }

    onOpenChange?.(transactionId);
  }

  if (isLoading) {
    return (
      <TransactionCardLayout
        aria-busy="true"
        aria-label="Loading transactions"
        variant={variant}
      >
        {[0, 1, 2].map((item) => (
          <TransactionSkeletonCard key={item} />
        ))}
      </TransactionCardLayout>
    );
  }

  if (transactions.length === 0) {
    return (
      <Flex
        align="center"
        bg="bg.surfaceElevated"
        borderColor="border.subtle"
        borderRadius="14px"
        borderWidth="1px"
        color="text.secondary"
        justify="center"
        minH="128px"
        p="5"
        textAlign="center"
      >
        <Text fontSize="13px" fontWeight="720">
          {emptyLabel}
        </Text>
      </Flex>
    );
  }

  return (
    <TransactionCardLayout variant={variant}>
      {transactions.map((transaction) => (
        <TransactionCard
          isOpen={transaction.id === currentOpenId}
          key={transaction.id}
          onToggle={() =>
            setOpenId(transaction.id === currentOpenId ? null : transaction.id)
          }
          transaction={transaction}
        />
      ))}
    </TransactionCardLayout>
  );
}

function TransactionCardLayout({
  children,
  variant,
  ...props
}: {
  "aria-busy"?: boolean | "true" | "false";
  "aria-label"?: string;
  children: ReactNode;
  variant: "stack" | "grid";
}) {
  if (variant === "grid") {
    const items = Children.toArray(children);

    return (
      <Box
        containerType="inline-size"
        minW="0"
        w="100%"
        css={{
          "& [data-transaction-layout='two'], & [data-transaction-layout='three']": {
            display: "none",
          },
          "@container (min-width: 892px)": {
            "& [data-transaction-layout='one']": {
              display: "none",
            },
            "& [data-transaction-layout='two']": {
              display: "grid",
            },
          },
          "@container (min-width: 1344px)": {
            "& [data-transaction-layout='two']": {
              display: "none",
            },
            "& [data-transaction-layout='three']": {
              display: "grid",
            },
          },
        }}
        {...props}
      >
        <Stack data-transaction-layout="one" gap="12px">
          {items.map((item, index) => (
            <Box key={`one-${index}`}>{item}</Box>
          ))}
        </Stack>
        <ColumnLayout columnCount={2} items={items} />
        <ColumnLayout columnCount={3} items={items} />
      </Box>
    );
  }

  return (
    <Stack gap="8px" {...props}>
      {children}
    </Stack>
  );
}

function ColumnLayout({
  columnCount,
  items,
}: {
  columnCount: 2 | 3;
  items: ReactNode[];
}) {
  return (
    <Grid
      data-transaction-layout={columnCount === 2 ? "two" : "three"}
      gap="12px"
      gridTemplateColumns={`repeat(${columnCount}, minmax(0, 1fr))`}
      minW="0"
      w="100%"
    >
      {Array.from({ length: columnCount }, (_, columnIndex) => (
        <Stack gap="12px" key={columnIndex} minW="0">
          {items
            .filter((_, itemIndex) => itemIndex % columnCount === columnIndex)
            .map((item, itemIndex) => (
              <Box key={`${columnCount}-${columnIndex}-${itemIndex}`}>
                {item}
              </Box>
            ))}
        </Stack>
      ))}
    </Grid>
  );
}

function TransactionCard({
  isOpen,
  onToggle,
  transaction,
}: {
  isOpen: boolean;
  onToggle: () => void;
  transaction: TransactionListItem;
}) {
  const title = merchantLabel(transaction);
  const description = transaction.description ?? "No description provided";
  const dateLabel = formatDate(transaction.posted_at ?? transaction.date);
  const amount = formatAmount(transaction.amount, transaction.currency);
  const confidence = parseConfidence(transaction.classification_confidence);

  return (
    <Box
      as="article"
      bg={isOpen ? "bg.surfaceElevated" : "bg.surface"}
      borderColor={isOpen ? "border.strong" : "border.subtle"}
      borderRadius="16px"
      borderWidth="1px"
      data-transaction-id={transaction.id}
      overflow="hidden"
      transition="border-color 140ms ease, background 140ms ease"
      _focusWithin={{
        outline: "2px solid",
        outlineColor: "accent.blue",
        outlineOffset: "2px",
      }}
      _hover={{
        bg: "bg.surfaceElevated",
        borderColor: isOpen ? "border.strong" : "border.subtle",
      }}
    >
      <Grid
        asChild
        alignItems="center"
        bg="transparent"
        cursor="pointer"
        gap={{ base: "3", md: "4" }}
        gridTemplateColumns={{
          base: "minmax(0, 1fr)",
          md: "minmax(0, 1fr) auto auto",
        }}
        p={{ base: "3", md: "12px" }}
        textAlign="left"
        w="100%"
        _focusVisible={{
          outline: "none",
        }}
      >
        <button
          aria-expanded={isOpen}
          aria-label={`${title} transaction details`}
          data-transaction-button-id={transaction.id}
          type="button"
          onClick={onToggle}
        >
          <Stack gap="2" minW="0">
            <Stack gap="0.5" minW="0">
              <Text
                color="text.primary"
                fontSize="16px"
                fontWeight="780"
                letterSpacing="0"
                lineHeight="1.2"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {title}
              </Text>
              <Text
                color="text.secondary"
                fontSize="12px"
                lineHeight="1.35"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {description} · {dateLabel}
              </Text>
            </Stack>

            <Flex align="center" gap="6px" wrap="wrap">
              {transaction.category ? (
                <CategoryChip value={transaction.category} />
              ) : null}
              <BucketChip value={transaction.report_bucket} />
              {confidence !== null ? <ConfidenceChip value={confidence} /> : null}
            </Flex>
          </Stack>

          <Text
            color={amount.isPositive ? "success" : "text.primary"}
            fontSize="16px"
            fontWeight="800"
            justifySelf={{ base: "start", md: "end" }}
            letterSpacing="0"
            lineHeight="1"
            whiteSpace="nowrap"
          >
            {amount.label}
          </Text>

          <Flex
            align="center"
            color="text.tertiary"
            h="28px"
            justifySelf={{ base: "start", md: "end" }}
            justify="center"
            w="28px"
          >
            <Box
              as="span"
              display="inline-flex"
              transform={isOpen ? "rotate(180deg)" : "rotate(0deg)"}
              transition="transform 140ms ease"
            >
              <ChevronIcon />
            </Box>
          </Flex>
        </button>
      </Grid>

      {isOpen ? (
        <Box px="12px" pb="12px">
          <Stack bg="bg.control" borderRadius="12px" gap="3" p="3">
            <Grid
              gap="3"
              gridTemplateColumns={{
                base: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              }}
            >
              <DetailItem label="Raw description" value={description} />
              <DetailItem label="Date" value={dateLabel} />
              <DetailItem
                label="Classification"
                value={sourceLabels[transaction.classification_source]}
              />
            </Grid>
            <Box>
              <Text
                color="text.tertiary"
                fontSize="10px"
                fontWeight="820"
                letterSpacing="0.08em"
                textTransform="uppercase"
              >
                Bucket classification
              </Text>
              <Text color="text.secondary" fontSize="12px" lineHeight="1.45" mt="1">
                {formatClassificationReason(transaction.classification_reason) ||
                  `We do not have enough context yet to explain why this was classified as ${bucketLabel(transaction.report_bucket).toLowerCase()}.`}
              </Text>
            </Box>
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <Box minW="0">
      <Text
        color="text.tertiary"
        fontSize="10px"
        fontWeight="820"
        letterSpacing="0.08em"
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Text
        color="text.primary"
        fontSize="12px"
        fontWeight="720"
        lineHeight="1.35"
        mt="1"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {value}
      </Text>
    </Box>
  );
}

function TransactionSkeletonCard() {
  return (
    <Box
      bg="bg.surface"
      borderColor="border.subtle"
      borderRadius="16px"
      borderWidth="1px"
      p="12px"
    >
      <Grid
        alignItems="center"
        gap={{ base: "3", md: "4" }}
        gridTemplateColumns={{ base: "1fr", md: "minmax(0, 1fr) 96px 28px" }}
      >
        <Stack gap="2">
          <Box bg="grid.line" borderRadius="8px" h="18px" maxW="260px" />
          <Box bg="bg.control" borderRadius="7px" h="14px" maxW="360px" />
          <Flex gap="6px" wrap="wrap">
            <Box bg="bg.control" borderRadius="999px" h="23px" w="84px" />
            <Box bg="bg.control" borderRadius="999px" h="23px" w="112px" />
            <Box bg="bg.control" borderRadius="999px" h="23px" w="92px" />
          </Flex>
        </Stack>
        <Box bg="grid.line" borderRadius="8px" h="17px" w="92px" />
        <Box bg="bg.control" borderRadius="full" h="28px" w="28px" />
      </Grid>
    </Box>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 16 16"
      width="14"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function merchantLabel(transaction: TransactionListItem) {
  return (
    transaction.merchant_name ||
    transaction.merchant ||
    transaction.description ||
    "Unknown merchant"
  );
}

function bucketLabel(value: BucketChipValue) {
  return bucketLabels[value];
}

function formatClassificationReason(value: string | null | undefined) {
  if (!value) return null;

  return value.replace(/^Bucket set to\b/i, "Set to");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatAmount(value: string | number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined || value === "") {
    return { isPositive: false, label: "--" };
  }

  const numericValue = typeof value === "number" ? value : Number.parseFloat(value);
  if (Number.isNaN(numericValue)) return { isPositive: false, label: String(value) };

  const absoluteValue = Math.abs(numericValue);
  const formatted = new Intl.NumberFormat("en-US", {
    currency: currency || "USD",
    style: "currency",
  }).format(absoluteValue);
  const sign = numericValue > 0 ? "+" : numericValue < 0 ? "-" : "";

  return { isPositive: numericValue > 0, label: `${sign}${formatted}` };
}

function parseConfidence(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;

  const numericValue = typeof value === "number" ? value : Number.parseFloat(value);
  if (Number.isNaN(numericValue)) return null;

  return Math.min(Math.max(numericValue, 0), 1);
}
