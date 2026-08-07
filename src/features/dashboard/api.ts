import { authenticatedFetch } from "@/services/api";

import type {
  MonthlyCapacityParams,
  MonthlyCapacityReport,
  ProjectionSettings,
  WealthCheckpoint,
  WealthCheckpointsResponse,
} from "./types";

export class DashboardApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "DashboardApiError";
  }
}

async function dashboardApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let detail = body;
    try {
      const parsed = JSON.parse(body) as { detail?: string };
      detail = parsed.detail ?? body;
    } catch {
      // The response is already useful plain text.
    }
    throw new DashboardApiError(
      detail || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function fetchMonthlyCapacity(
  params: MonthlyCapacityParams,
  signal?: AbortSignal,
): Promise<MonthlyCapacityReport> {
  const search = new URLSearchParams({
    anchor_month: params.anchorMonth,
    months: String(params.months),
    currency: params.currency,
    include_drafts: String(params.includeDrafts),
  });
  return dashboardApi<MonthlyCapacityReport>(
    `/reports/monthly-capacity?${search.toString()}`,
    { signal },
  );
}

export function fetchWealthCheckpoints(
  currency: string,
  signal?: AbortSignal,
): Promise<WealthCheckpointsResponse> {
  const search = new URLSearchParams({ currency });
  return dashboardApi<WealthCheckpointsResponse>(
    `/wealth/checkpoints?${search.toString()}`,
    { signal },
  );
}

export function fetchProjectionSettings(signal?: AbortSignal): Promise<ProjectionSettings> {
  return dashboardApi<ProjectionSettings>("/wealth/projection-settings", { signal });
}

export function saveProjectionSettings(annualReturn: number) {
  return dashboardApi<ProjectionSettings>("/wealth/projection-settings", {
    method: "PUT",
    body: JSON.stringify({
      average_annual_return_multiplier: (1 + annualReturn).toFixed(4),
    }),
  });
}

export function createWealthCheckpoint(payload: {
  checkpointDate: string;
  wealthAmount: string;
  currency: string;
}) {
  return dashboardApi<WealthCheckpoint>("/wealth/checkpoints", {
    method: "POST",
    body: JSON.stringify({
      checkpoint_date: payload.checkpointDate,
      wealth_amount: payload.wealthAmount,
      currency: payload.currency,
    }),
  });
}

export function deleteWealthCheckpoint(checkpointId: string) {
  return dashboardApi<void>(`/wealth/checkpoints/${encodeURIComponent(checkpointId)}`, {
    method: "DELETE",
  });
}
