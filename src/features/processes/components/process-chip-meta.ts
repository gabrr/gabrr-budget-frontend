import type { ChipTone } from "@/components/chips";

import { statusLabel } from "../mappers";

const JOB_STATUS: Record<string, { tone: ChipTone; icon: string }> = {
  pending: { tone: "pending", icon: "/brand/icons/clock.svg" },
  processing: { tone: "processing", icon: "/brand/icons/clock.svg" },
  done: { tone: "done", icon: "/brand/icons/check-circle.svg" },
  failed: { tone: "failed", icon: "/brand/icons/x.svg" },
};

export function jobStatusChip(status: string) {
  const meta = JOB_STATUS[status] ?? {
    tone: "neutral" as const,
    icon: "/brand/icons/question.svg",
  };

  return { ...meta, label: statusLabel(status) };
}
