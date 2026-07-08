"use client";

import { Box, Flex, Grid, Spinner, Stack, Text } from "@chakra-ui/react";
import { ConfidenceChip } from "@/components/chips";
import type { ReactNode } from "react";
import type {
  ImportTimelineJob,
  ImportTimelineStatementKind,
  ImportTimelineStatus,
} from "./types";

export type ImportTimelineProps = {
  jobs: ImportTimelineJob[];
  selectedJobId?: string;
  onSelectJob?: (jobId: string) => void;
  isLoading?: boolean;
  emptyLabel?: string;
  variant?: "card" | "embedded";
};

const statusLabels: Record<ImportTimelineStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  done: "Done",
  failed: "Failed",
};

const statementKindLabels: Record<ImportTimelineStatementKind, string> = {
  checking_account: "Checking account",
  credit_card: "Credit card",
  unknown: "Unknown statement",
};

const railLeft = "63px";

export function ImportTimeline({
  jobs,
  selectedJobId,
  onSelectJob,
  isLoading = false,
  emptyLabel = "No statement imports yet.",
  variant = "card",
}: ImportTimelineProps) {
  const isEmbedded = variant === "embedded";

  if (isLoading) {
    return (
      <Stack
        aria-busy="true"
        aria-label="Loading import timeline"
        gap="8px"
        p={isEmbedded ? "0" : "9px"}
      >
        {[0, 1, 2].map((item) => (
          <TimelineSkeletonRow key={item} />
        ))}
      </Stack>
    );
  }

  if (jobs.length === 0) {
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
    <Stack
      as="ol"
      gap="8px"
      listStyleType="none"
      m="0"
      p={isEmbedded ? "0" : "9px"}
    >
      {jobs.map((job) => (
        <Box as="li" key={job.job_id}>
          <TimelineRow
            isSelected={job.job_id === selectedJobId}
            job={job}
            onSelectJob={onSelectJob}
            variant={variant}
          />
        </Box>
      ))}
    </Stack>
  );
}

function TimelineRow({
  isSelected,
  job,
  onSelectJob,
  variant,
}: {
  isSelected: boolean;
  job: ImportTimelineJob;
  onSelectJob?: (jobId: string) => void;
  variant: "card" | "embedded";
}) {
  const isSelectable = Boolean(onSelectJob);
  const isEmbedded = variant === "embedded";
  const content = (
    <>
      <TimelineRail />
      <DateBlock value={job.created_at} />
      <Stack gap="1.5" minW="0" pb="1" pt="6px">
        <Flex align="center" gap="2" wrap="wrap">
          <StatementKindPill job={job} />
          <ImportStatusChip status={job.status} />
        </Flex>
        <Text
          color="text.primary"
          fontSize="13px"
          fontWeight="780"
          letterSpacing="0"
          lineHeight="1"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {job.original_filename || "Untitled import"}
        </Text>
        <Text color="text.secondary" fontSize="12px" lineHeight=".8">
          {secondaryLine(job)}
        </Text>
      </Stack>
    </>
  );

  return (
    <Grid
      asChild
      alignItems="center"
      bg={
        isEmbedded
          ? isSelected
            ? "bg.surfaceElevated"
            : "transparent"
          : "bg.surface"
      }
      borderColor={
        isEmbedded
          ? isSelected
            ? "border.subtle"
            : "transparent"
          : isSelected
            ? "border.strong"
            : "border.subtle"
      }
      borderRadius="14px"
      borderWidth="1px"
      cursor={isSelectable ? "pointer" : "default"}
      data-import-job-id={job.job_id}
      gap="32px"
      gridTemplateColumns="42px minmax(0, 1fr)"
      minH="88px"
      px="13px"
      py="9px"
      position="relative"
      textAlign="left"
      transition="background 140ms ease, border-color 140ms ease"
      w="100%"
      _hover={
        isSelectable
          ? {
              bg: "bg.surfaceElevated",
              borderColor: isEmbedded
                ? "border.subtle"
                : isSelected
                  ? "border.strong"
                  : "border.subtle",
            }
          : undefined
      }
      _focusVisible={
        isSelectable
          ? {
              outline: "2px solid",
              outlineColor: "accent.blue",
              outlineOffset: "2px",
            }
          : undefined
      }
    >
      {isSelectable ? (
        <button
          aria-label={`${job.original_filename || "Untitled import"} - ${statusLabels[job.status]}`}
          type="button"
          onClick={() => onSelectJob?.(job.job_id)}
        >
          {content}
        </button>
      ) : (
        <article
          aria-label={`${job.original_filename || "Untitled import"} - ${statusLabels[job.status]}`}
        >
          {content}
        </article>
      )}
    </Grid>
  );
}

function DateBlock({ value }: { value: string }) {
  const parsed = parseDateParts(value);

  return (
    <Stack align="flex-baseline" gap="0">
      <Text
        as="strong"
        color="text.primary"
        display="block"
        fontSize="20px"
        fontWeight="780"
        letterSpacing="0"
        lineHeight="1"
      >
        {parsed.day}
      </Text>
      <Text
        color="text.secondary"
        fontSize="16px"
        fontWeight="720"
        lineHeight="1.15"
      >
        {parsed.month}
      </Text>
      <Text color="text.secondary" fontSize="13px" lineHeight="1.25">
        {parsed.time}
      </Text>
    </Stack>
  );
}

function TimelineRail() {
  return (
    <Box
      aria-hidden="true"
      bg="grid.line"
      bottom="-8px"
      left={railLeft}
      position="absolute"
      top="-8px"
      transform="translateX(-50%)"
      w="2px"
      borderRadius="4px"
    >
      <Flex
        align="center"
        bg="bg.surface"
        borderColor="border.strong"
        borderRadius="full"
        borderWidth="1px"
        boxShadow="0 1px 2px rgba(0, 0, 0, 0.10)"
        h="12px"
        justify="center"
        left="50%"
        position="absolute"
        top="50%"
        transform="translateX(-50%)"
        w="12px"
      >
        <Box bg="text.primary" borderRadius="full" h="5px" w="5px" />
      </Flex>
    </Box>
  );
}

function ImportStatusChip({ status }: { status: ImportTimelineStatus }) {
  if (status === "done") {
    return (
      <StatusChip
        bg="successSoft"
        color="success"
        icon={<DoneStatusIcon />}
        label="Done"
      />
    );
  }

  if (status === "failed") {
    return <StatusChip bg="dangerSoft" color="danger" label="Failed" />;
  }

  return (
    <StatusChip
      bg="accent.blueSoft"
      color="accent.blueHover"
      icon={
        <Spinner
          color="currentColor"
          h="8px"
          w="8px"
          borderWidth="1.4px"
        />
      }
      label="Processing"
    />
  );
}

function DoneStatusIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="9"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.1"
      viewBox="0 0 12 12"
      width="9"
    >
      <path d="M2.4 6.2 4.8 8.6 9.7 3.5" />
    </svg>
  );
}

function StatusChip({
  bg,
  color,
  icon,
  label,
}: {
  bg: string;
  color: string;
  icon?: ReactNode;
  label: string;
}) {
  return (
    <Flex
      as="span"
      align="center"
      bg={bg}
      borderColor="chip.border"
      borderRadius="999px"
      borderWidth="1px"
      color={color}
      gap="5px"
      fontSize="10px"
      fontWeight="740"
      lineHeight="1"
      minH="20px"
      px="7px"
      py="4px"
      whiteSpace="nowrap"
    >
      {icon ?? <Box bg="currentColor" borderRadius="full" h="5px" w="5px" />}
      {label}
    </Flex>
  );
}

function StatementKindPill({ job }: { job: ImportTimelineJob }) {
  const label = statementKindLabels[job.statement_kind];
  const confidence = parseConfidence(job.statement_kind_confidence);

  if (confidence !== null) {
    return <ConfidenceChip label={label} value={confidence} />;
  }

  return (
    <Box
      as="span"
      bg="chip.bg"
      borderColor="chip.border"
      borderRadius="999px"
      borderWidth="1px"
      color="text.secondary"
      display="inline-flex"
      fontSize="11px"
      fontWeight="760"
      lineHeight="1"
      minH="24px"
      px="9px"
      py="6px"
      whiteSpace="nowrap"
    >
      {label}
    </Box>
  );
}

function TimelineSkeletonRow() {
  return (
    <Grid
      alignItems="start"
      gap="24px"
      gridTemplateColumns="58px minmax(0, 1fr)"
      minH="88px"
      p="9px"
      position="relative"
    >
      <TimelineRail />
      <Stack align="flex-end" gap="2" pt="2">
        <Box bg="grid.line" borderRadius="6px" h="20px" w="28px" />
        <Box bg="bg.control" borderRadius="6px" h="12px" w="46px" />
      </Stack>
      <Stack gap="2" pt="1">
        <Box bg="bg.control" borderRadius="999px" h="20px" w="126px" />
        <Box bg="grid.line" borderRadius="8px" h="17px" maxW="260px" />
        <Box bg="bg.control" borderRadius="8px" h="14px" maxW="180px" />
      </Stack>
    </Grid>
  );
}

function secondaryLine(job: ImportTimelineJob) {
  if (job.status === "failed") {
    return job.error_message || job.current_step || "Failed";
  }

  return job.current_step || statusLabels[job.status];
}

function parseDateParts(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { day: "--", month: "Unknown", time: "--:--" };
  }

  const day = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
  }).format(date);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  }).format(date);

  return { day, month, time };
}

function parseConfidence(value: string | number | null) {
  if (value === null) return null;

  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value);

  if (Number.isNaN(numericValue)) return null;

  return Math.min(Math.max(numericValue, 0), 1);
}
