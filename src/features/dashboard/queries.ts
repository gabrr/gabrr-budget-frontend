import { queryOptions } from "@tanstack/react-query";

import {
  fetchMonthlyCapacity,
  fetchProjectionSettings,
  fetchWealthCheckpoints,
} from "./api";
import type { MonthlyCapacityParams } from "./types";

export const dashboardQueryKeys = {
  root: ["dashboard"] as const,
  reports: () => [...dashboardQueryKeys.root, "monthly-capacity"] as const,
  report: (params: MonthlyCapacityParams) =>
    [...dashboardQueryKeys.reports(), params] as const,
  checkpoints: (currency: string) =>
    [...dashboardQueryKeys.root, "wealth-checkpoints", currency] as const,
  settings: () => [...dashboardQueryKeys.root, "projection-settings"] as const,
};

export function monthlyCapacityQuery(params: MonthlyCapacityParams) {
  return queryOptions({
    queryKey: dashboardQueryKeys.report(params),
    queryFn: ({ signal }) => fetchMonthlyCapacity(params, signal),
    staleTime: 60_000,
  });
}

export function wealthCheckpointsQuery(currency: string) {
  return queryOptions({
    queryKey: dashboardQueryKeys.checkpoints(currency),
    queryFn: ({ signal }) => fetchWealthCheckpoints(currency, signal),
    staleTime: 5 * 60_000,
  });
}

export function projectionSettingsQuery() {
  return queryOptions({
    queryKey: dashboardQueryKeys.settings(),
    queryFn: ({ signal }) => fetchProjectionSettings(signal),
    staleTime: 5 * 60_000,
  });
}
