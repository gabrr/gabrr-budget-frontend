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
    dot: "#3f7a5b",
    background: "#fbfdfc",
    border: "#d6e2db",
    color: "#35443d",
  },
  debt_installment: {
    dot: "#94544a",
    background: "#fffdfc",
    border: "#e5d7d4",
    color: "#453936",
  },
  fixed_cost: {
    dot: "#466a8a",
    background: "#fbfcfd",
    border: "#d6dee7",
    color: "#364047",
  },
  living_cost: {
    dot: "#9a7a30",
    background: "#fffefb",
    border: "#e5dcc1",
    color: "#474237",
  },
  excluded: {
    dot: "#8b9290",
    background: "#fbfbfb",
    border: "#dcdfdd",
    color: "#555d59",
  },
  unknown: {
    dot: "#8d9491",
    background: "#fff",
    border: "#c9d0cd",
    color: "#555d59",
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
