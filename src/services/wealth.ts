import { API_BASE_URL, type ImportJobResponse } from "@/services/import";

export type Transaction = {
  id: string;
  posted_at: string | null;
  date: string | null;
  description: string | null;
  amount: string | number | null;
  currency: string | null;
  report_bucket: string;
  classification_confidence: string | number | null;
  classification_reason: string | null;
  is_draft: boolean;
};

export type TransactionsResponse = {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
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

export function fetchTransactions(): Promise<TransactionsResponse> {
  return api<TransactionsResponse>("/transactions?limit=100&is_draft=true");
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
