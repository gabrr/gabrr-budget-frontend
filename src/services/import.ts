export type ImportJobResponse = {
  job_id: string;
  status: string;
  current_step: string | null;
  status_url: string;
  events_url: string;
};

export type ImportJobEvent = ImportJobResponse & {
  error_message?: string | null;
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function uploadImportFile(file: File): Promise<ImportJobResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/agents/process-file`, {
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
  const response = await fetch(`${API_BASE_URL}${statusUrl}`);
  if (!response.ok) {
    throw new Error(`Status check failed with status ${response.status}`);
  }

  return response.json();
}
