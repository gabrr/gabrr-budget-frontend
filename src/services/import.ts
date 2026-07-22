import { authenticatedFetch } from "@/services/api";

export type ImportJobResponse = {
  job_id: string;
  status: string;
  current_step: string | null;
  error_message?: string | null;
  original_filename: string | null;
  statement_kind: string;
  statement_kind_confidence: string | null;
  status_url: string;
  events_url: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
};
export type ImportJobEvent = ImportJobResponse;

export async function uploadImportFile(file: File): Promise<ImportJobResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await authenticatedFetch("/agents/process-file", {
    method: "POST",
    headers: {
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Upload failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchImportJob(statusUrl: string): Promise<ImportJobEvent> {
  const response = await authenticatedFetch(statusUrl);
  if (!response.ok) {
    throw new Error(`Status check failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchActiveImportJob(): Promise<ImportJobEvent | null> {
  const response = await authenticatedFetch("/import-jobs/active");
  if (response.status === 204) return null;
  if (!response.ok) {
    throw new Error(`Active job check failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchImportJobs(limit = 20): Promise<ImportJobEvent[]> {
  const response = await authenticatedFetch(`/import-jobs?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Job list failed with status ${response.status}`);
  }

  return response.json();
}

export async function pollImportJob(
  statusUrl: string,
  onUpdate: (job: ImportJobEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    const update = await fetchImportJob(statusUrl);
    if (signal.aborted) return;
    onUpdate(update);
    if (update.status === "done" || update.status === "failed") return;
    await abortableDelay(1500, signal);
  }
}

function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const timeout = window.setTimeout(finish, milliseconds);
    const abort = () => {
      window.clearTimeout(timeout);
      finish();
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
