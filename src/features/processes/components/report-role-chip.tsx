import { PassiveChip, type ChipTone } from "@/components/chips";

import type { ReportBucket } from "../types";

type ReportRoleMeta = {
  label: string;
  icon: string;
  tone: ChipTone;
};

const REPORT_ROLE_META: Record<ReportBucket, ReportRoleMeta> = {
  income: {
    label: "Income",
    icon: "/brand/icons/arrow-down-left.svg",
    tone: "income",
  },
  debt_installment: {
    label: "Debt installment",
    icon: "/brand/icons/credit-card.svg",
    tone: "debt",
  },
  fixed_cost: {
    label: "Fixed cost",
    icon: "/brand/icons/calendar-blank.svg",
    tone: "fixed",
  },
  living_cost: {
    label: "Living cost",
    icon: "/brand/icons/shopping-bag.svg",
    tone: "living",
  },
  excluded: {
    label: "Excluded",
    icon: "/brand/icons/minus-circle.svg",
    tone: "excluded",
  },
  unknown: {
    label: "Unknown",
    icon: "/brand/icons/question.svg",
    tone: "unknown",
  },
};

function normalizeReportRole(value: string): ReportBucket {
  return value in REPORT_ROLE_META ? (value as ReportBucket) : "unknown";
}

export function reportRoleLabel(value: string) {
  return REPORT_ROLE_META[normalizeReportRole(value)].label;
}

export function ReportRoleChip({ value }: { value: string }) {
  const meta = REPORT_ROLE_META[normalizeReportRole(value)];

  return (
    <PassiveChip
      justifySelf="start"
      label={meta.label}
      icon={meta.icon}
      tone={meta.tone}
    />
  );
}
