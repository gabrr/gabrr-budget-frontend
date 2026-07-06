export type ImportTimelineStatus =
  | "pending"
  | "processing"
  | "done"
  | "failed";

export type ImportTimelineStatementKind =
  | "checking_account"
  | "credit_card"
  | "unknown";

export type ImportTimelineJob = {
  job_id: string;
  status: ImportTimelineStatus;
  current_step: string | null;
  error_message: string | null;
  original_filename: string | null;
  statement_kind: ImportTimelineStatementKind;
  statement_kind_confidence: string | number | null;
  status_url: string;
  events_url: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
};
