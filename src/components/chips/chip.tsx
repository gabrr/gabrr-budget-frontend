import { Box, type BoxProps } from "@chakra-ui/react";
import type { CSSProperties, ReactNode } from "react";

export type ChipTone =
  | "income"
  | "fixed"
  | "living"
  | "debt"
  | "excluded"
  | "unknown"
  | "pending"
  | "processing"
  | "done"
  | "failed"
  | "high"
  | "medium"
  | "low"
  | "neutral";

export const CHIP_TONE_STYLE: Record<ChipTone, { bg: string; color: string }> = {
  income: { bg: "evergreen", color: "canvas" },
  fixed: { bg: "cashFixed", color: "canvas" },
  living: { bg: "cashVariable", color: "canvas" },
  debt: { bg: "cashDebt", color: "canvas" },
  excluded: { bg: "muted", color: "canvas" },
  unknown: { bg: "antique", color: "canvas" },
  pending: { bg: "horizon", color: "canvas" },
  processing: { bg: "antique", color: "canvas" },
  done: { bg: "evergreen", color: "canvas" },
  failed: { bg: "oxblood", color: "canvas" },
  high: { bg: "cashFixed", color: "canvas" },
  medium: { bg: "antique", color: "canvas" },
  low: { bg: "oxblood", color: "canvas" },
  neutral: { bg: "graphite", color: "canvas" },
};

export function ChipIcon({ src, size = 16 }: { src: string; size?: number }) {
  return (
    <Box
      as="span"
      aria-hidden="true"
      boxSize={`${size}px`}
      flex="none"
      bg="currentColor"
      style={{ "--chip-icon": `url("${src}")` } as CSSProperties}
      css={{
        WebkitMask: "var(--chip-icon) center / contain no-repeat",
        mask: "var(--chip-icon) center / contain no-repeat",
      }}
    />
  );
}

export function ConfidenceRing({ value }: { value: number | null }) {
  const progress = value === null
    ? "rgb(255 255 255 / 58%)"
    : `conic-gradient(#fff ${value}%, rgb(16 16 16 / 55%) 0)`;

  return (
    <Box
      as="span"
      aria-hidden="true"
      boxSize="16px"
      flex="none"
      borderRadius="full"
      bg={progress}
      css={{
        WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)",
        mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)",
      }}
      _highContrast={{ bg: "CanvasText" }}
    />
  );
}

type PassiveChipProps = Omit<BoxProps, "children" | "color"> & {
  label: string;
  tone?: ChipTone;
  icon?: string;
  leading?: ReactNode;
};

export function PassiveChip({
  label,
  tone = "neutral",
  icon,
  leading,
  ...props
}: PassiveChipProps) {
  return (
    <Box
      as="span"
      {...props}
      display="inline-flex"
      alignItems="center"
      minH="28px"
      alignSelf="center"
      maxW="100%"
      px="10px"
      py="5px"
      gap="6px"
      border="1px solid transparent"
      borderRadius="control"
      bg={CHIP_TONE_STYLE[tone].bg}
      color={CHIP_TONE_STYLE[tone].color}
      fontFamily="interface"
      fontSize="12px"
      fontWeight="600"
      lineHeight="16px"
      textTransform="none"
      _highContrast={{
        borderColor: "CanvasText",
        bg: "Canvas",
        color: "CanvasText",
      }}
    >
      {leading ?? (icon ? <ChipIcon src={icon} /> : null)}
      <Box
        as="span"
        minW="0"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {label}
      </Box>
    </Box>
  );
}

export function confidenceTone(value: number | null): ChipTone {
  if (value === null) return "neutral";
  if (value < 50) return "low";
  if (value < 70) return "medium";
  return "high";
}

export function ConfidenceChip({
  value,
  label,
  ...props
}: Omit<PassiveChipProps, "tone" | "leading"> & { value: number | null }) {
  return (
    <PassiveChip
      {...props}
      label={label}
      tone={confidenceTone(value)}
      leading={<ConfidenceRing value={value} />}
    />
  );
}
