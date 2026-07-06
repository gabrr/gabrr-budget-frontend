"use client";

import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { ChipShell } from "./chip-shell";
import type { CategoryChipValue, TransactionChipClickHandler } from "./types";

type CategoryChipProps = {
  value: CategoryChipValue;
  onClick?: TransactionChipClickHandler;
};

const categoryLabels: Record<CategoryChipValue, string> = {
  food: "Food",
  transportation: "Transportation",
  health: "Health",
  leisure: "Leisure",
  needs: "Needs",
  fun: "Fun",
  donations: "Donations",
  clothing: "Clothing",
  renting: "Renting",
  home: "Home",
  company: "Company",
  others: "Others",
};

const categoryColors: Record<CategoryChipValue, string> = {
  food: "warning",
  transportation: "accent.blueHover",
  health: "success",
  leisure: "danger",
  needs: "#7a838a",
  fun: "#9b7182",
  donations: "#776a9f",
  clothing: "#a77b54",
  renting: "warning",
  home: "success",
  company: "accent.blueHover",
  others: "#9aa09d",
};

export function CategoryChip({ value, onClick }: CategoryChipProps) {
  return (
    <ChipShell
      icon={<CategoryIcon value={value} />}
      label={categoryLabels[value]}
      onClick={onClick}
    >
      {null}
    </ChipShell>
  );
}

function CategoryIcon({ value }: { value: CategoryChipValue }) {
  return (
    <Box
      as="span"
      aria-hidden="true"
      color={categoryColors[value]}
      display="inline-grid"
      flex="0 0 13px"
      h="13px"
      placeItems="center"
      w="13px"
    >
      <svg
        fill="none"
        height="13"
        viewBox="0 0 16 16"
        width="13"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={value === "health" ? "2.35" : "1.9"}
        >
          {categoryIconPaths[value]}
        </g>
      </svg>
    </Box>
  );
}

const categoryIconPaths: Record<CategoryChipValue, ReactNode> = {
  food: (
    <>
      <path d="M5 2v10" />
      <path d="M3 2v3a2 2 0 1 0 4 0V2" />
      <path d="M10 2v10" />
      <path d="M10 2c1.5.7 2.2 2 2.2 3.8 0 1.5-.8 2.6-2.2 3" />
    </>
  ),
  transportation: (
    <>
      <path d="M3.2 8.2 4.4 5c.2-.7.8-1 1.5-1h4.2c.7 0 1.3.4 1.5 1l1.2 3.2" />
      <path d="M3 8h10v3H3z" />
      <path d="M4.8 11.2v.8" />
      <path d="M11.2 11.2v.8" />
      <path d="M4.8 9.5h.1" />
      <path d="M11.1 9.5h.1" />
    </>
  ),
  health: (
    <>
      <path d="M8 3.2v9.6" />
      <path d="M3.2 8h9.6" />
    </>
  ),
  leisure: (
    <>
      <path d="M4.2 3.5h7.6v9H4.2z" />
      <path d="m6.7 6 3.2 2-3.2 2z" />
    </>
  ),
  needs: (
    <>
      <path d="M4.8 5.2h6.4l.8 7H4z" />
      <path d="M6 5.2a2 2 0 0 1 4 0" />
      <path d="M6.2 8h3.6" />
      <path d="M6.2 10h2.2" />
    </>
  ),
  fun: (
    <>
      <circle cx="8" cy="8" r="5" />
      <path d="m6.8 5.8 3.7 2.2-3.7 2.2z" />
    </>
  ),
  donations: (
    <>
      <path d="M8 12.2s-4.5-2.7-4.5-6A2.4 2.4 0 0 1 8 4.9a2.4 2.4 0 0 1 4.5 1.3c0 3.3-4.5 6-4.5 6z" />
      <path d="M5.2 12.3h5.6" />
    </>
  ),
  clothing: (
    <>
      <path d="M5.2 3.5 3 5.3l1.5 2 1-.6v5.8h5V6.7l1 .6 1.5-2-2.2-1.8" />
      <path d="M6.2 3.5a1.8 1.8 0 0 0 3.6 0" />
    </>
  ),
  renting: (
    <>
      <path d="M6.3 8.3a2.5 2.5 0 1 1 1.5 1.5" />
      <path d="M7.8 9.8 12 14" />
      <path d="m10 11.8 1.1-1.1" />
      <path d="m11.2 13 1.1-1.1" />
    </>
  ),
  home: (
    <>
      <path d="m3 7.2 5-4.1 5 4.1" />
      <path d="M4.5 6.8v5.7h7V6.8" />
      <path d="M6.8 12.5V9h2.4v3.5" />
    </>
  ),
  company: (
    <>
      <path d="M4 6h8v6.5H4z" />
      <path d="M6.2 6V4.5h3.6V6" />
      <path d="M4 8.5h8" />
      <path d="M7.3 8.5v1h1.4v-1" />
    </>
  ),
  others: (
    <>
      <path d="M4.3 8h.1" />
      <path d="M8 8h.1" />
      <path d="M11.7 8h.1" />
      <circle cx="8" cy="8" r="5" />
    </>
  ),
};
