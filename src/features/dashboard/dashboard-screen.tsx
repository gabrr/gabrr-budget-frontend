"use client";

import {
  Box,
  Button,
  Container,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import NextLink from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  createWealthCheckpoint,
  deleteWealthCheckpoint,
  saveProjectionSettings,
} from "./api";
import { GoalDock } from "./components/goal-dock";
import { GoalEditor } from "./components/goal-editor";
import { MonthlyCashFlowChart } from "./components/monthly-cash-flow-chart";
import { WealthPreview } from "./components/wealth-preview";
import {
  buildScenarioBasis,
  buildWealthProjection,
  DEFAULT_GOAL,
  formatMoney,
  hasFinancialActivity,
  reportAnchorMonth,
  toNumber,
} from "./model";
import {
  dashboardQueryKeys,
  monthlyCapacityQuery,
  projectionSettingsQuery,
  wealthCheckpointsQuery,
} from "./queries";
import type {
  GoalScenario,
  MonthlyCapacityParams,
  MonthlyCapacityReport,
  ProjectionSettings,
  WealthCheckpoint,
} from "./types";
import styles from "./dashboard.module.css";

const REPORT_CURRENCY = "BRL";

const reportParams: MonthlyCapacityParams = {
  anchorMonth: reportAnchorMonth(),
  months: 60,
  currency: REPORT_CURRENCY,
  includeDrafts: true,
};

export function DashboardScreen() {
  return <DashboardData />;
}

function DashboardData() {
  const reportQuery = useQuery(monthlyCapacityQuery(reportParams));
  const checkpointsQuery = useQuery(wealthCheckpointsQuery(reportParams.currency));
  const settingsQuery = useQuery(projectionSettingsQuery());
  const isLoading = reportQuery.isPending || checkpointsQuery.isPending || settingsQuery.isPending;
  const error = reportQuery.error ?? checkpointsQuery.error ?? settingsQuery.error;
  const isRefreshing = [reportQuery, checkpointsQuery, settingsQuery].some(
    (query) => query.isFetching && !query.isPending,
  );
  const updatedAt = Math.min(
    ...[reportQuery.dataUpdatedAt, checkpointsQuery.dataUpdatedAt, settingsQuery.dataUpdatedAt]
      .filter((value) => value > 0),
  );
  const retryAll = () => {
    void Promise.all([
      reportQuery.refetch(),
      checkpointsQuery.refetch(),
      settingsQuery.refetch(),
    ]);
  };
  if (isLoading) return <DashboardLoading />;

  if (!reportQuery.data || !checkpointsQuery.data || !settingsQuery.data) {
    return (
      <DashboardState
        title="We couldn’t load your dashboard"
        detail={error instanceof Error ? error.message : "The dashboard data is unavailable."}
        actionLabel="Try again"
        onAction={retryAll}
      />
    );
  }
	
  return (
    <DashboardReady
      report={reportQuery.data}
      checkpoints={checkpointsQuery.data.checkpoints}
      settings={settingsQuery.data}
      backgroundError={error instanceof Error ? error.message : null}
      isRefreshing={isRefreshing}
      updatedAt={updatedAt}
      onRetry={retryAll}
    />
  );
}

function DashboardReady({
  report,
  checkpoints,
  settings,
  backgroundError,
  isRefreshing,
  updatedAt,
  onRetry,
}: {
  report: MonthlyCapacityReport;
  checkpoints: WealthCheckpoint[];
  settings: ProjectionSettings;
  backgroundError: string | null;
  isRefreshing: boolean;
  updatedAt: number;
  onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const persistedAnnualReturn = Number(settings.average_annual_return_multiplier) - 1;
  const initialAnnualReturn = settings.is_default
    ? DEFAULT_GOAL.annualReturn
    : Math.min(0.21, Math.max(0.06, persistedAnnualReturn));
  const [scenario, setScenario] = useState<GoalScenario>(() => ({
    ...DEFAULT_GOAL,
    annualReturn: Number.isFinite(initialAnnualReturn) ? initialAnnualReturn : DEFAULT_GOAL.annualReturn,
  }));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [goalStatus, setGoalStatus] = useState("");
  const editorReturnFocusRef = useRef<HTMLElement | null>(null);
  const shouldRestoreEditorFocusRef = useRef(false);
  const basis = useMemo(
    () => buildScenarioBasis(report, checkpoints),
    [checkpoints, report],
  );
  const projection = useMemo(
    () => buildWealthProjection(scenario, basis),
    [basis, scenario],
  );
  const hasCheckpoint = checkpoints.length > 0 || report.wealth_checkpoints.length > 0;
  const hasFinancialHistory = hasFinancialActivity(report);
  const savedCheckpoint = checkpoints.at(-1) ?? report.wealth_checkpoints.at(-1) ?? null;
  const settingsMutation = useMutation({ mutationFn: saveProjectionSettings });
  const checkpointMutation = useMutation({
    mutationFn: createWealthCheckpoint,
  });
  const deleteCheckpointMutation = useMutation({
    mutationFn: deleteWealthCheckpoint,
  });

  async function handleSave(
    nextScenario: GoalScenario,
    checkpoint: { date: string; amount: string } | null,
  ) {
    let shouldRefreshSavedData = false;
    try {
      if (checkpoint) {
        await checkpointMutation.mutateAsync({
          checkpointDate: checkpoint.date,
          wealthAmount: checkpoint.amount,
          currency: report.currency,
        });
        shouldRefreshSavedData = true;
      }
      await settingsMutation.mutateAsync(nextScenario.annualReturn);
      shouldRefreshSavedData = true;
      setScenario(nextScenario);
      setGoalStatus(
        checkpoint
          ? "Annual return and wealth checkpoint saved. Other scenario changes apply only to this visit."
          : "Annual return saved. Other scenario changes apply only to this visit.",
      );
    } finally {
      if (shouldRefreshSavedData) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.reports() }),
          queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.settings() }),
          queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.checkpoints(reportParams.currency) }),
        ]);
      }
    }
  }

  async function handleDeleteCheckpoint(checkpointId: string) {
    await deleteCheckpointMutation.mutateAsync(checkpointId);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.checkpoints(reportParams.currency) }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.reports() }),
    ]);
  }

  function openEditor() {
    editorReturnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    shouldRestoreEditorFocusRef.current = false;
    setIsEditorOpen(true);
  }

  function handleApplyPreview(nextScenario: GoalScenario) {
    setScenario(nextScenario);
    setGoalStatus("Preview applied for this visit. Saved assumptions and checkpoints were not changed.");
  }

  function closeEditor() {
    shouldRestoreEditorFocusRef.current = true;
    setIsEditorOpen(false);
  }

  useEffect(() => {
    if (isEditorOpen || !shouldRestoreEditorFocusRef.current) return;
    const opener = editorReturnFocusRef.current;
    const timeout = window.setTimeout(() => {
      shouldRestoreEditorFocusRef.current = false;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isEditorOpen]);

  return (
    <Box as="main" className={styles.page} id="main">
      <Container maxW="1180px" px={{ base: "3", sm: "5", md: "0" }} py={{ base: "5", md: "8" }}>
        <Stack gap="18px">
          <div className={styles.dashboardFreshness} role="status">
            <span>Updated {formatUpdatedTime(updatedAt)}</span>
            {isRefreshing ? <span>Refreshing</span> : null}
          </div>
          {backgroundError ? (
            <div className={styles.inlineError} role="alert">
              <span>We couldn&apos;t refresh the latest dashboard data. You&apos;re seeing the last cached version.</span>
              <Button size="xs" variant="ghost" onClick={onRetry}>Retry</Button>
            </div>
          ) : null}
          {!hasFinancialHistory ? (
            <section className={`${styles.chartShell} ${styles.financialEmpty}`} aria-labelledby="financial-empty-title">
              <div>
                <Text className={styles.sectionLabel}>MONTHLY CASH FLOW</Text>
                <h1 id="financial-empty-title">Import your financial history</h1>
                <p>The report window is ready, but it does not contain income or costs yet. Import a statement to build your cash flow and investing pace.</p>
                <div className={styles.emptyActions}>
                  <Button asChild colorPalette="gray"><NextLink href="/processes">Import in Processes</NextLink></Button>
                  <Button variant="ghost" aria-haspopup="dialog" onClick={openEditor}>{hasCheckpoint ? "Manage wealth settings/checkpoints" : "Add wealth checkpoint"}</Button>
                </div>
              </div>
              {savedCheckpoint ? (
                <aside aria-label="Saved wealth starting point">
                  <span>Wealth starting point saved</span>
                  <strong>{formatMoney(toNumber(savedCheckpoint.wealth_amount), report.currency)}</strong>
                  <small>{"checkpoint_date" in savedCheckpoint ? savedCheckpoint.checkpoint_date : savedCheckpoint.date}</small>
                </aside>
              ) : null}
            </section>
          ) : hasCheckpoint ? (
            <>
              <WealthPreview basis={basis} projection={projection} scenario={scenario} />
              <GoalDock
                basis={basis}
                projection={projection}
                scenario={scenario}
                onEdit={openEditor}
              />
            </>
          ) : (
            <section className={`${styles.chartShell} ${styles.checkpointEmpty}`} aria-labelledby="checkpoint-empty-title">
              <Text className={styles.sectionLabel}>INVESTING PACE</Text>
              <h1 id="checkpoint-empty-title">Start your Wealth Preview</h1>
              <p>Add your current wealth as a checkpoint. That gives the projection a real starting point; no placeholder balance will be invented.</p>
              <Button colorPalette="gray" aria-haspopup="dialog" onClick={openEditor}>Add wealth checkpoint</Button>
            </section>
          )}

          {hasFinancialHistory ? <MonthlyCashFlowChart report={report} /> : null}

          <footer className={styles.methodNote}>
            <p>Today&apos;s money <span aria-hidden="true">·</span> based on imported transactions <span aria-hidden="true">·</span> illustrative estimate</p>
            <details>
              <summary>View assumptions</summary>
              <p>Returns, inflation, spending, and contributions can change the result. Retirement age, lifestyle, and growth switches are preview-only for this visit; the annual return and wealth checkpoints are saved to your account.</p>
            </details>
          </footer>
          {goalStatus ? <p className={styles.goalStatus} role="status">{goalStatus}</p> : null}
        </Stack>
      </Container>

      {isEditorOpen ? (
        <GoalEditor
          basis={basis}
          scenario={scenario}
          checkpoints={checkpoints}
          onClose={closeEditor}
          onApplyPreview={handleApplyPreview}
          onSave={handleSave}
          onDeleteCheckpoint={handleDeleteCheckpoint}
        />
      ) : null}
    </Box>
  );
}

function formatUpdatedTime(timestamp: number) {
  if (!Number.isFinite(timestamp)) return "recently";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function DashboardLoading() {
  return (
    <Box as="main" className={styles.page}>
      <Container maxW="1180px" px={{ base: "3", sm: "5", md: "0" }} py={{ base: "5", md: "8" }}>
        <Stack gap="4" role="status" aria-label="Loading cash flow, checkpoints, and projection settings">
          <div className={`${styles.skeletonBlock} ${styles.wealthSkeleton}`}>
            <i /><b /><span /><span /><span />
          </div>
          <div className={styles.goalSkeletonRow}>
            <div className={`${styles.skeletonBlock} ${styles.goalSkeleton}`}><i /><b /><span /></div>
            <div className={`${styles.skeletonBlock} ${styles.addGoalSkeleton}`}><i /><span /></div>
          </div>
          <div className={`${styles.skeletonBlock} ${styles.cashFlowSkeleton}`}>
            <i /><b />
            <div>{Array.from({ length: 12 }, (_, index) => <span key={index} />)}</div>
          </div>
          <span className={styles.srOnly}>Building your financial view…</span>
        </Stack>
      </Container>
    </Box>
  );
}

function DashboardState({
  title,
  detail,
  actionLabel,
  onAction,
}: {
  title: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Box as="main" className={styles.page}>
      <Container maxW="760px" px={{ base: "3", md: "6" }} py={{ base: "8", md: "16" }}>
        <div className={styles.dashboardState}>
          <Text className={styles.sectionLabel}>DASHBOARD</Text>
          <h1>{title}</h1>
          <p>{detail}</p>
          <Button colorPalette="gray" onClick={onAction}>{actionLabel}</Button>
        </div>
      </Container>
    </Box>
  );
}
