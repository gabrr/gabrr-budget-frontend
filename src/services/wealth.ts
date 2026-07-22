import { authenticatedFetch } from "@/services/api";
import type { ImportJobResponse } from "@/services/import";

export type Transaction = {
  id: string;
  import_job_id: string | null;
  posted_at: string | null;
  date: string | null;
  description: string | null;
  merchant_name: string | null;
  merchant?: string | null;
  amount: string | number | null;
  currency: string | null;
  category: string | null;
  report_bucket: string;
  classification_source: string;
  classification_confidence: string | number | null;
  classification_reason: string | null;
  is_draft: boolean;
  statement_kind?: string;
  transaction_nature: string;
};

export type TransactionsResponse = {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
};

export type FetchTransactionsOptions = {
  importJobId?: string;
  isDraft?: boolean;
  limit?: number;
  offset?: number;
};

export type WealthCheckpoint = {
  id: string;
  checkpoint_date: string;
  wealth_amount: string;
  currency: string;
};

export type ProjectionSettings = {
  average_annual_return_multiplier: string;
  is_default: boolean;
};

export type MonthlyReportMonth = {
  month: string;
  label: string;
  income: string;
  living_costs: string;
  fixed_costs: string;
  debt_installments: string;
  investment_capacity: string;
  unused_capacity: string;
  capacity_ceiling: string;
  projected_wealth: string | null;
  has_debt_pressure: boolean;
  has_debt_drop: boolean;
  has_investment_capacity: boolean;
};

export type MonthlyCapacityReport = {
  currency: string;
  average_annual_return_multiplier: string;
  wealth_checkpoints: Array<{ date: string; wealth_amount: string }>;
  months: MonthlyReportMonth[];
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchMonthlyCapacityReport(): Promise<MonthlyCapacityReport> {
  const currentYear = new Date().getFullYear();
  return api<MonthlyCapacityReport>(
    `/reports/monthly-capacity?anchor_month=${currentYear}-01&months=60&include_drafts=true`,
  );
}

export function fetchTransactions(
  options: FetchTransactionsOptions = {},
): Promise<TransactionsResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 100));
  params.set("is_draft", String(options.isDraft ?? true));

  if (options.importJobId) {
    params.set("import_job_id", options.importJobId);
  }
  if (options.offset) {
    params.set("offset", String(options.offset));
  }

  return api<TransactionsResponse>(`/transactions?${params.toString()}`);
}

export function updateTransactionBucket(
  transactionId: string,
  reportBucket: string,
): Promise<Transaction> {
  return api<Transaction>(`/transactions/${transactionId}`, {
    method: "PATCH",
    body: JSON.stringify({ report_bucket: reportBucket }),
  });
}

export function createWealthCheckpoint(payload: {
  checkpoint_date: string;
  wealth_amount: string;
  currency?: string;
}): Promise<WealthCheckpoint> {
  return api<WealthCheckpoint>("/wealth/checkpoints", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveProjectionSettings(payload: {
  average_annual_return_multiplier: string;
}): Promise<ProjectionSettings> {
  return api<ProjectionSettings>("/wealth/projection-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchProjectionSettings(): Promise<ProjectionSettings> {
  return api<ProjectionSettings>("/wealth/projection-settings");
}

export type ImportJobWithError = ImportJobResponse & {
  error_message?: string | null;
};
