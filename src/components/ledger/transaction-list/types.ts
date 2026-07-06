import type { BucketChipValue, CategoryChipValue } from "@/components/chips";

export type TransactionClassificationSource = "agent" | "user" | "system";

export type TransactionNature =
  | "income"
  | "expense"
  | "transfer"
  | "refund"
  | "card_payment"
  | "unknown";

export type TransactionListItem = {
  id: string;
  import_job_id?: string | null;
  posted_at?: string | null;
  date?: string | null;
  description?: string | null;
  merchant_name?: string | null;
  merchant?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  category?: CategoryChipValue | null;
  report_bucket: BucketChipValue;
  classification_source: TransactionClassificationSource;
  classification_confidence?: string | number | null;
  classification_reason?: string | null;
  is_draft: boolean;
  transaction_nature: TransactionNature;
};
