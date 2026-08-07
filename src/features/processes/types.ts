export type ImportJobStatus = "pending" | "processing" | "done" | "failed";
export type StatementKind = "checking_account" | "credit_card" | "unknown";

export type ImportJob = {
  job_id: string;
  status: ImportJobStatus | string;
  current_step: string | null;
  error_message?: string | null;
  original_filename: string | null;
  statement_kind: StatementKind | string;
  statement_kind_confidence: string | number | null;
  status_url: string;
  events_url: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
};

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

export type TransactionsParams = {
  importJobId: string;
  isDraft: boolean;
  limit: number;
  offset: number;
};

export type TransactionsCollection = {
  items: Transaction[];
  total: number;
};

export type ReportBucket =
  | "income"
  | "debt_installment"
  | "fixed_cost"
  | "living_cost"
  | "excluded"
  | "unknown";

export type TransactionNature =
  | "income"
  | "expense"
  | "transfer"
  | "refund"
  | "card_payment"
  | "unknown";

export type TransactionPatch = Partial<{
  report_bucket: ReportBucket;
  transaction_nature: TransactionNature;
}>;

export type Evidence =
  | { kind: "statement"; job: ImportJob }
  | { kind: "transaction"; transaction: Transaction; statementKind: string };
