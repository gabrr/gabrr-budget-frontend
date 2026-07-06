"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import type { TransactionChipClickHandler } from "./types";

type ConfidenceChipProps = {
  value: number;
  label?: string;
  onClick?: TransactionChipClickHandler;
};

type ConfidenceLevel = "low" | "medium" | "high";

const donutRingMask = {
  WebkitMask: "radial-gradient(farthest-side, transparent 54%, #000 56%)",
  mask: "radial-gradient(farthest-side, transparent 54%, #000 56%)",
};

const confidenceStyles: Record<
  ConfidenceLevel,
  {
    label: string;
    fill: string;
    background: string;
  }
> = {
  low: {
    label: "Low",
    fill: "danger",
    background: "dangerSoft",
  },
  medium: {
    label: "Medium",
    fill: "warning",
    background: "warningSoft",
  },
  high: {
    label: "High",
    fill: "success",
    background: "successSoft",
  },
};

export function ConfidenceChip({ value, label, onClick }: ConfidenceChipProps) {
  const percent = toPercent(value);
  const level = getConfidenceLevel(value);
  const style = confidenceStyles[level];
  const isButton = Boolean(onClick);
  const displayLabel = label ?? style.label;
  const content = (
    <>
      <ConfidenceDonut
        fill={style.fill}
        percent={percent}
      />
      <Text as="span">
        {displayLabel} {percent}%
      </Text>
    </>
  );

  return (
    <Flex
      align="center"
      asChild
      bg={style.background}
      borderColor="chip.border"
      borderRadius="999px"
      borderWidth="1px"
      color={style.fill}
      cursor={isButton ? "pointer" : "default"}
      display="inline-flex"
      fontSize="10.5px"
      fontWeight="720"
      gap="5px"
      lineHeight="1"
      minH="23px"
      px="8px"
      py="3px"
      whiteSpace="nowrap"
      _hover={
        isButton
          ? {
              borderColor: "chip.borderHover",
              bg: style.background,
            }
          : undefined
      }
      _focusVisible={
        isButton
          ? {
              outline: "2px solid",
              outlineColor: "accent.blue",
              outlineOffset: "2px",
            }
          : undefined
      }
    >
      {isButton ? (
        <button type="button" onClick={onClick}>
          {content}
        </button>
      ) : (
        <span>{content}</span>
      )}
    </Flex>
  );
}

function ConfidenceDonut({
  fill,
  percent,
}: {
  fill: string;
  percent: number;
}) {
  return (
    <Box
      aria-hidden="true"
      borderRadius="full"
      flex="0 0 12px"
      h="12px"
      position="relative"
      w="12px"
    >
      <Box
        bg="grid.line"
        borderRadius="full"
        inset="0"
        position="absolute"
        style={donutRingMask}
      />
      <Box
        bg={`conic-gradient(currentColor 0deg ${percent * 3.6}deg, transparent ${percent * 3.6}deg 360deg)`}
        borderRadius="full"
        color={fill}
        inset="0"
        position="absolute"
        style={donutRingMask}
      />
    </Box>
  );
}

function toPercent(value: number) {
  return Math.round(Math.min(Math.max(value, 0), 1) * 100);
}

function getConfidenceLevel(value: number): ConfidenceLevel {
  if (value < 0.5) return "low";
  if (value < 0.7) return "medium";
  return "high";
}
