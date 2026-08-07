import type { ImportJob, Transaction } from "./types";

const statusLabels: Record<string, string> = {
  pending: "Queued",
  processing: "Processing",
  done: "Ready",
  failed: "Import failed",
};

const friendlySteps: Record<string, string> = {
  "Upload received": "File received",
  "Queued for processing": "Queued for processing",
  "Processing started": "Processing started",
  "Reading PDF with agent": "Agent started reading the statement",
  "Starting statement ingestion": "Preparing statement",
  "Converting PDF to Markdown": "Converting PDF to text",
  "PDF converted to Markdown": "PDF converted to text",
  "Preparing converted statement": "Preparing statement text",
  "Reading statement chunks": "Reading statement sections",
  "Normalizing transactions": "Normalizing transaction data",
  "Generating transaction JSON": "Structuring transactions",
  "Validating transactions": "Validating transactions",
  "Draft transactions saved": "Transactions saved",
  "Waiting to retry": "Waiting to retry",
  Failed: "Import failed",
};

export function statusLabel(status: string) {
  return statusLabels[status] ?? "Queued";
}

export function statementKindLabel(kind: string) {
  if (kind === "credit_card") return "Credit card";
  if (kind === "checking_account") return "Checking account";
  return "Statement";
}

export function displayStatementFilename(value: string | null | undefined) {
  if (!value) return "Imported statement";
  const basename = value.split(/[\\/]/).at(-1) || value;
  return basename.replace(
    /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{12,})[_-]+(?=.+)/i,
    "",
  );
}

export function confidencePercent(value: string | number | null) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round((Math.abs(parsed) <= 1 ? parsed * 100 : parsed) * 10) / 10;
}

export function friendlyStep(value: string | null) {
  if (!value) return "Waiting for the agent";
  const chunk = value.match(/^Reading statement chunk (\d+) of (\d+)$/);
  if (chunk) return `Reading statement section ${chunk[1]} of ${chunk[2]}`;
  return friendlySteps[value] ?? value;
}

export function jobTimestamp(job: ImportJob) {
  const date = new Date(job.created_at);
  return Number.isNaN(date.valueOf()) ? new Date(0) : date;
}

export function formatJobTime(job: ImportJob) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(jobTimestamp(job));
}

export function formatJobDay(job: ImportJob) {
  const date = jobTimestamp(job);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
  const day = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date);
  return `${weekday} ${day}`;
}

export function formatJobMonth(job: ImportJob) {
  const date = jobTimestamp(job);
  return {
    key: `${date.getFullYear()}-${date.getMonth()}`,
    month: new Intl.DateTimeFormat("en", { month: "long" }).format(date),
    year: date.getFullYear(),
  };
}

export function transactionDate(transaction: Transaction) {
  const raw = transaction.posted_at || transaction.date;
  if (!raw) return null;
  const date = new Date(`${raw.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export function formatTransactionDay(transaction: Transaction) {
  const date = transactionDate(transaction);
  if (!date) return "Date unavailable";
  const day = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("en", { month: "short" }).format(date);
  return `${day} ${month}`;
}

export function formatTransactionDate(transaction: Transaction) {
  const date = transactionDate(transaction);
  if (!date) return "Unavailable";
  const day = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("en", { month: "short" }).format(date);
  return `${day} ${month} ${date.getFullYear()}`;
}

export function periodFromTransactions(items: Transaction[]) {
  const date = items.map(transactionDate).find((value) => value !== null);
  if (!date) return { month: "Transactions", year: "" };
  return {
    month: new Intl.DateTimeFormat("en", { month: "long" }).format(date),
    year: String(date.getFullYear()),
  };
}

export function formatAmount(transaction: Transaction) {
  const amount = Number(transaction.amount ?? 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const sign = safeAmount > 0 ? "+" : safeAmount < 0 ? "−" : "";
  const requestedCurrency = transaction.currency?.toUpperCase() || "BRL";
  let formatted: string;

  try {
    formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: requestedCurrency,
    }).format(Math.abs(safeAmount));
  } catch {
    formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Math.abs(safeAmount));
  }

  return `${sign} ${formatted}`.trim();
}

export function titleCase(value: string | null | undefined, fallback = "Unclassified") {
  if (!value || value === "unknown") return fallback;
  const normalized = value.replaceAll("_", " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function transactionTitle(transaction: Transaction) {
  return transaction.merchant_name || transaction.merchant || transaction.description || "Transaction";
}

export function classificationTone(value: string | number | null) {
  const percent = confidencePercent(value);
  if (percent === null || percent < 50) return "low";
  if (percent < 70) return "medium";
  return "high";
}

export function roleTone(role: string) {
  if (role === "needs_review" || role === "unknown") return "review";
  if (role === "income") return "income";
  if (role === "excluded") return "excluded";
  return "default";
}
