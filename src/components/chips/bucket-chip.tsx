"use client";

import { ChipShell } from "./chip-shell";
import type { BucketChipValue, TransactionChipClickHandler } from "./types";

type BucketChipProps = {
  value: BucketChipValue;
  onClick?: TransactionChipClickHandler;
};

const bucketLabels: Record<BucketChipValue, string> = {
  income: "Income",
  debt_installment: "Debt installment",
  fixed_cost: "Fixed cost",
  living_cost: "Living cost",
  excluded: "Excluded",
  unknown: "Unknown",
};

const bucketStyles: Record<
  BucketChipValue,
  {
    dot: string;
    background: string;
    border: string;
    color: string;
    borderStyle?: "solid" | "dashed";
  }
> = {
  income: {
    dot: "success",
    background: "chip.bg",
    border: "chip.border",
    color: "chip.text",
  },
  debt_installment: {
    dot: "danger",
    background: "chip.bg",
    border: "chip.border",
    color: "chip.text",
  },
  fixed_cost: {
    dot: "accent.blueHover",
    background: "chip.bg",
    border: "chip.border",
    color: "chip.text",
  },
  living_cost: {
    dot: "warning",
    background: "chip.bg",
    border: "chip.border",
    color: "chip.text",
  },
  excluded: {
    dot: "#8b9290",
    background: "chip.bg",
    border: "chip.border",
    color: "chip.text",
  },
  unknown: {
    dot: "#8d9491",
    background: "chip.bg",
    border: "chip.border",
    color: "chip.text",
    borderStyle: "dashed",
  },
};

export function BucketChip({ value, onClick }: BucketChipProps) {
  const style = bucketStyles[value];

  return (
    <ChipShell
      background={style.background}
      borderColor={style.border}
      borderStyle={style.borderStyle}
      color={style.color}
      dotColor={style.dot}
      label={bucketLabels[value]}
      onClick={onClick}
    >
      {null}
    </ChipShell>
  );
}
