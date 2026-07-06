"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import type { TransactionChipClickHandler } from "./types";

type ConfidenceChipProps = {
  value: number;
  onClick?: TransactionChipClickHandler;
};

type ConfidenceLevel = "low" | "medium" | "high";

const confidenceStyles: Record<
  ConfidenceLevel,
  {
    label: string;
    fill: string;
  }
> = {
  low: {
    label: "Low",
    fill: "#94544a",
  },
  medium: {
    label: "Medium",
    fill: "#9a7a30",
  },
  high: {
    label: "High",
    fill: "#3f7a5b",
  },
};

export function ConfidenceChip({ value, onClick }: ConfidenceChipProps) {
  const percent = toPercent(value);
  const level = getConfidenceLevel(value);
  const style = confidenceStyles[level];
  const isButton = Boolean(onClick);
  const content = (
    <>
      <ConfidenceDonut fill={style.fill} percent={percent} />
      <Text as="span">
        {style.label} {percent}%
      </Text>
    </>
  );

  return (
    <Flex
      align="center"
      asChild
      bg="chip.bg"
      borderColor="chip.border"
      borderRadius="999px"
      borderWidth="1px"
      color="chip.text"
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
              bg: "chip.bgHover",
            }
          : undefined
      }
      _focusVisible={
        isButton
          ? {
              outline: "3px solid rgba(49, 95, 85, 0.24)",
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
      bg="grid.line"
      borderRadius="full"
      flex="0 0 12px"
      h="12px"
      position="relative"
      w="12px"
    >
      <Box
        bg={`conic-gradient(${fill} ${percent * 3.6}deg, transparent 0deg)`}
        borderRadius="full"
        inset="0"
        position="absolute"
      />
      <Box
        bg="chip.bg"
        borderRadius="full"
        inset="3px"
        position="absolute"
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
