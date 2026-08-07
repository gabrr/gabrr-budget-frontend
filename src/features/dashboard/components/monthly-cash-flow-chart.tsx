"use client";

import { Box, Text } from "@chakra-ui/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

import {
  addUtcMonths,
  formatChartMoney,
  formatMoney,
  formatMonth,
  monthKey,
  toNumber,
} from "../model";
import type { MonthlyCapacityMonth, MonthlyCapacityReport } from "../types";
import { ChartTooltip } from "./chart-tooltip";
import type { ChartTooltipRow } from "./chart-tooltip";
import { clamp } from "./chart-geometry";
import styles from "../dashboard.module.css";

type MonthlyCashFlowChartProps = {
  report: MonthlyCapacityReport;
};

type Inspection = {
  month: string;
  mode: "hover" | "locked" | "keyboard";
} | null;

type CashFlowAverages = {
  income: number;
  fixed: number;
  variable: number;
};

type RenderedCashFlowMonth = {
  source: MonthlyCapacityMonth;
  type: "past" | "current" | "future";
  income: number;
  fixed: number;
  variable: number;
  debt: number;
  invested: number;
  available: number;
  shortfall: number;
  total: number;
};

type CashFlowBarSegment = {
  key: "fixed" | "variable" | "debt" | "invested" | "available";
  label: string;
  color: string;
  value: number;
};

type CashFlowBarSegmentLayout = CashFlowBarSegment & {
  logicalHeight: number;
  paintHeight: number;
  roundTop: boolean;
  y: number;
};

const DESKTOP_CHART_HEIGHT = 420;
const MOBILE_CHART_HEIGHT = 410;
const MOBILE_CHART_BREAKPOINT = 660;
const CARD_PADDING_BREAKPOINT = 760;
const MINIMUM_MONTH_BAND = 52;
const MOBILE_LEFT_MARGIN = 46;
const DESKTOP_LEFT_MARGIN = 62;
const RIGHT = 10;
const BAR_TOP = 174;
const BOTTOM = 60;
const MINIMUM_UPCOMING_MONTHS = 6;
const MINIMUM_SELECTION_HEIGHT = 18;
const TOOLTIP_GUTTER = 8;
const TAP_MOVEMENT_TOLERANCE = 8;

const actualSegments = [
  { key: "fixed", label: "Fixed", color: "#313944" },
  { key: "variable", label: "Variable", color: "#627693" },
  { key: "debt", label: "Debt", color: "#6f2935" },
  { key: "invested", label: "Invested", color: "#eef2f6" },
] as const;

function hasCashFlowData(month: MonthlyCapacityMonth) {
  return [
    month.income,
    month.fixed_costs,
    month.living_costs,
    month.debt_installments,
    month.investment_capacity,
  ].some((value) => Math.abs(toNumber(value)) > 0);
}

export function cashFlowDisplayMonths(
  report: MonthlyCapacityReport,
  now = new Date(),
) {
  const currentMonth = monthKey(now);
  const minimumFutureEnd = monthKey(addUtcMonths(
    new Date(`${currentMonth}-01T00:00:00Z`),
    MINIMUM_UPCOMING_MONTHS,
  ));
  const lastMeaningfulFuture = report.months.findLast(
    (month) => month.month > currentMonth && hasCashFlowData(month),
  )?.month;
  const displayEnd = lastMeaningfulFuture && lastMeaningfulFuture > minimumFutureEnd
    ? lastMeaningfulFuture
    : minimumFutureEnd;

  return report.months.filter((month) => month.month <= displayEnd);
}

function cashFlowAverages(
  months: MonthlyCapacityMonth[],
  currentMonth: string,
): CashFlowAverages {
  const observed = months
    .filter((month) => month.month < currentMonth && toNumber(month.income) > 0)
    .slice(-12);
  const divisor = Math.max(1, observed.length);
  const average = (pick: (month: MonthlyCapacityMonth) => number) =>
    observed.reduce((sum, month) => sum + pick(month), 0) / divisor;

  return {
    income: average((month) => toNumber(month.income)),
    fixed: average((month) => toNumber(month.fixed_costs)),
    variable: average((month) => toNumber(month.living_costs)),
  };
}

function renderMonth(
  source: MonthlyCapacityMonth,
  currentMonth: string,
  averages: CashFlowAverages,
  includeFutureVariable: boolean,
): RenderedCashFlowMonth {
  const type = source.month < currentMonth
    ? "past"
    : source.month === currentMonth
      ? "current"
      : "future";
  const rawInvestment = toNumber(source.investment_capacity);

  if (type === "past") {
    const fixed = toNumber(source.fixed_costs);
    const variable = toNumber(source.living_costs);
    const debt = toNumber(source.debt_installments);
    const invested = Math.max(0, rawInvestment);
    const shortfall = Math.max(0, -rawInvestment);
    return {
      source,
      type,
      income: toNumber(source.income),
      fixed,
      variable,
      debt,
      invested,
      available: 0,
      shortfall,
      total: fixed + variable + debt + invested,
    };
  }

  const income = toNumber(source.income) > 0 ? toNumber(source.income) : averages.income;
  const fixed = toNumber(source.fixed_costs) > 0 ? toNumber(source.fixed_costs) : averages.fixed;
  const variable = type === "future" && includeFutureVariable ? averages.variable : 0;
  const debt = toNumber(source.debt_installments);
  const available = Math.max(0, income - fixed - variable - debt);
  const shortfall = Math.max(0, fixed + variable + debt - income);
  return {
    source,
    type,
    income,
    fixed,
    variable,
    debt,
    invested: 0,
    available,
    shortfall,
    total: fixed + variable + debt + available,
  };
}

function cashFlowBarSegments(month: RenderedCashFlowMonth): CashFlowBarSegment[] {
  if (month.type === "past") {
    return actualSegments.map((segment) => ({
      ...segment,
      value: month[segment.key],
    }));
  }

  return [
    { key: "fixed", label: "Fixed", color: "#313944", value: month.fixed },
    ...(month.variable > 0
      ? [{ key: "variable" as const, label: "Variable", color: "#627693", value: month.variable }]
      : []),
    { key: "debt", label: "Debt", color: "#6f2935", value: month.debt },
    { key: "available", label: "Available", color: "url(#dashboard-unused-capacity)", value: month.available },
  ];
}

function layoutCashFlowBarSegments(
  segments: CashFlowBarSegment[],
  ceiling: number,
  baseline: number,
  plotHeight: number,
): CashFlowBarSegmentLayout[] {
  let cursorY = baseline;

  return segments.map((segment, index) => {
    const logicalHeight = (segment.value / ceiling) * plotHeight;
    cursorY -= logicalHeight;

    return {
      ...segment,
      logicalHeight,
      paintHeight: Math.max(1, logicalHeight),
      roundTop: index === segments.length - 1,
      y: cursorY,
    };
  });
}

function roundedTopPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 5,
) {
  const resolvedRadius = Math.min(radius, width / 2, height);
  return `M ${x} ${y + resolvedRadius} Q ${x} ${y} ${x + resolvedRadius} ${y} H ${x + width - resolvedRadius} Q ${x + width} ${y} ${x + width} ${y + resolvedRadius} V ${y + height} H ${x} Z`;
}

function selectionFrame(top: number, baseline: number) {
  const bottom = baseline + 4;
  const height = Math.max(MINIMUM_SELECTION_HEIGHT, bottom - top + 4);
  return { y: bottom - height, height };
}

function cashFlowScale(maximumValue: number) {
  const roughStep = Math.max(1, maximumValue) / 3;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalizedStep = roughStep / magnitude;
  const factor = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]
    .find((candidate) => candidate >= normalizedStep) ?? 10;
  const step = factor * magnitude;
  return {
    ceiling: step * 3,
    ticks: [0, step, step * 2, step * 3],
  };
}

function describeRenderedMonth(month: RenderedCashFlowMonth, currency: string) {
  const label = formatMonth(month.source.month);
  if (month.type === "past") {
    return `${label}. Income ${formatMoney(month.income, currency)}. Fixed ${formatMoney(month.fixed, currency)}. Variable ${formatMoney(month.variable, currency)}. Debt ${formatMoney(month.debt, currency)}. ${month.shortfall > 0 ? `Capacity shortfall ${formatMoney(month.shortfall, currency)}.` : `Invested ${formatMoney(month.invested, currency)}.`}`;
  }
  return `${label}. Predicted income ${formatMoney(month.income, currency)}. Recurring fixed ${formatMoney(month.fixed, currency)}. Scheduled debt ${formatMoney(month.debt, currency)}. ${month.shortfall > 0 ? `Capacity shortfall ${formatMoney(month.shortfall, currency)}.` : `Available cash flow ${formatMoney(month.available, currency)}.`}`;
}

function formatCashFlowAxisTick(value: number) {
  if (value === 0) return "0";

  const absoluteValue = Math.abs(value);
  const units = [
    { threshold: 1_000_000_000, suffix: "b" },
    { threshold: 1_000_000, suffix: "m" },
    { threshold: 1_000, suffix: "k" },
  ] as const;
  const unit = units.find(({ threshold }) => absoluteValue >= threshold);

  if (!unit) return String(value);

  const scaledValue = value / unit.threshold;
  const label = Number.isInteger(scaledValue)
    ? String(scaledValue)
    : scaledValue.toFixed(1).replace(/\.0$/, "");
  return `${label}${unit.suffix}`;
}

function tooltipRows(month: RenderedCashFlowMonth, currency: string): ChartTooltipRow[] {
  if (month.type === "past") {
    return [
      { label: "Fixed", value: formatMoney(month.fixed, currency), indicator: "fixed" },
      { label: "Variable", value: formatMoney(month.variable, currency), indicator: "variable" },
      { label: "Debt", value: formatMoney(month.debt, currency), indicator: "debt" },
      month.shortfall > 0
        ? { label: "Capacity shortfall", value: formatMoney(month.shortfall, currency), divider: true }
        : { label: "Invested", value: formatMoney(month.invested, currency), indicator: "invested", divider: true },
    ];
  }

  return [
    { label: "Recurring fixed", value: formatMoney(month.fixed, currency), indicator: "fixed" },
    { label: "Scheduled debt", value: formatMoney(month.debt, currency), indicator: "debt" },
    month.shortfall > 0
      ? { label: "Capacity shortfall", value: formatMoney(month.shortfall, currency), divider: true }
      : { label: "Available cash flow", value: formatMoney(month.available, currency), divider: true },
  ];
}

function placeCashFlowTooltip(
  tooltip: HTMLDivElement,
  scroll: HTMLDivElement,
  anchorX: number,
  anchorY: number,
) {
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  const minimum = scroll.scrollLeft + TOOLTIP_GUTTER;
  const maximum = scroll.scrollLeft + scroll.clientWidth - tooltipWidth - TOOLTIP_GUTTER;
  tooltip.style.left = `${clamp(anchorX - tooltipWidth / 2, minimum, Math.max(minimum, maximum))}px`;
  tooltip.style.top = `${Math.max(TOOLTIP_GUTTER, anchorY - tooltipHeight - 22)}px`;
}

export function MonthlyCashFlowChart({ report }: MonthlyCashFlowChartProps) {
  const months = cashFlowDisplayMonths(report);
  const currentMonth = monthKey(new Date());
  const averages = cashFlowAverages(months, currentMonth);
  const [inspection, setInspection] = useState<Inspection>(null);
  const [includeFutureVariable, setIncludeFutureVariable] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [browserWidth, setBrowserWidth] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipGeometryRef = useRef({ anchorX: 0, anchorY: 0 });
  const scrollFrameRef = useRef<number | null>(null);
  const didInitialScrollRef = useRef(false);
  const pointerStartRef = useRef<{
    month: string;
    x: number;
    y: number;
    scrollLeft: number;
  } | null>(null);

  const renderedMonths = months.map((month) => renderMonth(
    month,
    currentMonth,
    averages,
    includeFutureVariable,
  ));
  const selectedIndex = inspection
    ? Math.max(0, months.findIndex((month) => month.month === inspection.month))
    : Math.max(0, months.findIndex((month) => month.month === currentMonth));
  const selected = renderedMonths[selectedIndex] ?? null;
  const leftMargin = browserWidth > 0 && browserWidth <= CARD_PADDING_BREAKPOINT
    ? MOBILE_LEFT_MARGIN
    : DESKTOP_LEFT_MARGIN;
  const minimumWidth = leftMargin + RIGHT + months.length * MINIMUM_MONTH_BAND;
  const width = Math.max(320, viewportWidth, minimumWidth);
  const chartHeight = browserWidth > 0 && browserWidth <= MOBILE_CHART_BREAKPOINT
    ? MOBILE_CHART_HEIGHT
    : DESKTOP_CHART_HEIGHT;
  const barBaseline = chartHeight - BOTTOM;
  const plotHeight = barBaseline - BAR_TOP;
  const innerWidth = width - leftMargin - RIGHT;
  const monthBand = innerWidth / Math.max(1, months.length);
  const barWidth = Math.min(40, monthBand * 0.62);
  const centerX = (index: number) => leftMargin + monthBand * index + monthBand / 2;
  const maxRaw = Math.max(1, ...renderedMonths.map((month) => Math.max(month.income, month.total)));
  const { ceiling, ticks: yTicks } = cashFlowScale(maxRaw);
  const barY = (value: number) =>
    barBaseline - (value / ceiling) * plotHeight;
  const futureIndex = renderedMonths.findIndex((month) => month.type === "future");
  const futureMonths = renderedMonths.filter((month) => month.type === "future");
  const forecastSelection = inspection?.month
    ? futureMonths.find((month) => month.source.month === inspection.month) ?? futureMonths[0]
    : futureMonths[0];
  const selectedShowsTooltip = Boolean(inspection && selected && selected.type !== "future");
  const selectedDescription = selected
    ? describeRenderedMonth(selected, report.currency)
    : "No cash-flow month is available.";
  const selectedAnchorX = centerX(selectedIndex);
  const selectedSegments = selected
    ? layoutCashFlowBarSegments(
        cashFlowBarSegments(selected),
        ceiling,
        barBaseline,
        plotHeight,
      )
    : [];
  const selectedVisualTop = selectedSegments.length
    ? Math.min(...selectedSegments.map((segment) => segment.y))
    : barBaseline;
  const selectedAnchorY = selected
    ? Math.min(
        barY(Math.max(selected.income, selected.total)),
        selectedVisualTop,
      )
    : barBaseline;
  const futureStartX = futureIndex >= 0 ? centerX(futureIndex) - monthBand / 2 : width;
  const compactForecast = width <= MOBILE_CHART_BREAKPOINT;
  const forecastLeft = compactForecast ? leftMargin + 8 : futureStartX + 12;
  const forecastAvailableWidth = compactForecast
    ? width - leftMargin - RIGHT - 16
    : width - RIGHT - futureStartX - 24;
  const forecastWidth = Math.max(286, forecastAvailableWidth);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const updateChartDimensions = () => {
      setViewportWidth((current) =>
        current === scroll.clientWidth ? current : scroll.clientWidth);
      setBrowserWidth((current) =>
        current === window.innerWidth ? current : window.innerWidth);
    };
    updateChartDimensions();
    const observer = new ResizeObserver(updateChartDimensions);
    observer.observe(scroll);
    window.addEventListener("resize", updateChartDimensions);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateChartDimensions);
    };
  }, []);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll || didInitialScrollRef.current || viewportWidth <= 0) return;
    const currentIndex = Math.max(0, months.findIndex((month) => month.month === currentMonth));
    const currentAnchor = leftMargin + monthBand * currentIndex + monthBand / 2;
    const centerCurrent = Math.max(0, currentAnchor - scroll.clientWidth * 0.55);
    const revealForecast = Math.max(
      0,
      forecastLeft + forecastWidth - scroll.clientWidth + 12,
    );
    scroll.scrollLeft = scroll.scrollWidth > scroll.clientWidth
      ? Math.max(centerCurrent, scroll.clientWidth < 500 ? revealForecast : 0)
      : 0;
    didInitialScrollRef.current = true;
  }, [currentMonth, forecastLeft, forecastWidth, leftMargin, monthBand, months, viewportWidth]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll || !inspection) return;
    const anchor = leftMargin + monthBand * selectedIndex + monthBand / 2;
    const visibleStart = scroll.scrollLeft;
    const visibleEnd = visibleStart + scroll.clientWidth;
    if (anchor < visibleStart || anchor > visibleEnd) {
      scroll.scrollLeft = Math.max(0, anchor - scroll.clientWidth / 2);
    }
  }, [inspection, leftMargin, monthBand, selectedIndex, viewportWidth]);

  useLayoutEffect(() => {
    tooltipGeometryRef.current = {
      anchorX: selectedAnchorX,
      anchorY: selectedAnchorY,
    };
    const tooltip = tooltipRef.current;
    const scroll = scrollRef.current;
    if (!selectedShowsTooltip || !tooltip || !scroll) return;
    placeCashFlowTooltip(tooltip, scroll, selectedAnchorX, selectedAnchorY);
  }, [selectedAnchorX, selectedAnchorY, selectedShowsTooltip, width]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  function scheduleTooltipPosition() {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const tooltip = tooltipRef.current;
      const scroll = scrollRef.current;
      if (!tooltip || !scroll) return;
      const geometry = tooltipGeometryRef.current;
      placeCashFlowTooltip(tooltip, scroll, geometry.anchorX, geometry.anchorY);
    });
  }

  function inspectMonth(month: string, mode: NonNullable<Inspection>["mode"]) {
    setInspection((current) => {
      if (mode === "hover" && current?.mode === "locked") return current;
      if (current?.month === month && current.mode === mode) return current;
      return { month, mode };
    });
  }

  function handleMonthKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setInspection(null);
      return;
    }
    const currentIndex = inspection
      ? selectedIndex
      : Math.max(0, months.findIndex((month) => month.month === currentMonth));
    const next = event.key === "ArrowRight"
      ? Math.min(months.length - 1, currentIndex + 1)
      : event.key === "ArrowLeft"
        ? Math.max(0, currentIndex - 1)
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? Math.max(0, months.length - 1)
            : null;
    if (next === null) return;
    event.preventDefault();
    inspectMonth(months[next]?.month ?? currentMonth, "keyboard");
  }

  function handleMonthPointerDown(
    event: ReactPointerEvent<SVGGElement>,
    month: string,
  ) {
    pointerStartRef.current = {
      month,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: scrollRef.current?.scrollLeft ?? 0,
    };
  }

  function handleMonthPointerUp(
    event: ReactPointerEvent<SVGGElement>,
    month: string,
  ) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.month !== month) return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    const scrolled = Math.abs((scrollRef.current?.scrollLeft ?? 0) - start.scrollLeft);
    if (moved <= TAP_MOVEMENT_TOLERANCE && scrolled <= TAP_MOVEMENT_TOLERANCE) {
      inspectMonth(month, "locked");
    }
  }

  const forecastPanel = futureIndex >= 0 && forecastSelection ? (
    <div
      className={styles.forecastCard}
      style={{ left: forecastLeft, top: 24, width: forecastWidth }}
      aria-label="Upcoming prediction settings"
    >
      <div className={styles.forecastCardTop}>
        <div className={styles.forecastIntro}>
          <span>Upcoming</span>
          <strong>{formatMonth(futureMonths[0].source.month, false)} {futureMonths[0].source.month.slice(0, 4)} - {formatMonth(futureMonths.at(-1)!.source.month, false)} {futureMonths.at(-1)!.source.month.slice(0, 4)}</strong>
        </div>
        <div className={styles.forecastMetric}>
          <span>Predicted income</span>
          <strong>{formatChartMoney(forecastSelection.income, report.currency)}/mo</strong>
        </div>
      </div>
      <label className={styles.forecastToggle}>
        <span><b>Include variable costs</b><small>{formatChartMoney(averages.variable, report.currency)}/mo average</small></span>
        <input
          type="checkbox"
          role="switch"
          checked={includeFutureVariable}
          onChange={(event) => setIncludeFutureVariable(event.currentTarget.checked)}
          aria-label={`Include variable costs using the ${formatMoney(averages.variable, report.currency)} monthly average`}
        />
        <i aria-hidden="true" />
      </label>
      <div className={styles.forecastSelection}>
        <span>{formatMonth(forecastSelection.source.month)} available</span>
        <strong>{formatChartMoney(forecastSelection.available, report.currency)}</strong>
      </div>
    </div>
  ) : null;

  return (
    <Box as="section" className={`${styles.chartShell} ${styles.cashFlowShell}`} aria-labelledby="cash-flow-title">
      <header className={styles.cashFlowHeading}>
        <div>
          <Text className={styles.sectionLabel}>Spending</Text>
          <h2 id="cash-flow-title">Monthly cash flow</h2>
          <p>{months.length ? `${formatMonth(months[0].month, false)} ${months[0].month.slice(0, 4)} - ${formatMonth(months.at(-1)!.month, false)} ${months.at(-1)!.month.slice(0, 4)}` : ""}</p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className={styles.historyScroll}
        tabIndex={0}
        role="listbox"
        aria-label="Monthly cash-flow timeline. Use Left and Right Arrow keys to inspect months."
        aria-activedescendant={inspection ? `cash-flow-month-${selectedIndex}` : undefined}
        aria-describedby="cash-flow-active-month"
        onKeyDown={handleMonthKeyDown}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setInspection((current) => current?.mode === "keyboard" ? null : current);
          }
        }}
        onScroll={scheduleTooltipPosition}
      >
        <div
          className={styles.historyControl}
          style={{ width, height: chartHeight }}
        >
            <svg
              viewBox={`0 0 ${width} ${chartHeight}`}
              role="img"
              aria-label={`Monthly cash flow for ${months.length} months in ${report.currency}`}
              data-testid="monthly-capacity-chart"
            >
            <defs>
              <pattern id="dashboard-unused-capacity" width="7" height="7" patternUnits="userSpaceOnUse">
                <rect width="7" height="7" fill="#e7ecef" />
                <path d="M-1 1L1-1M0 7L7 0M6 8L8 6" fill="none" stroke="#9eacb7" strokeWidth=".8" opacity=".42" />
              </pattern>
            </defs>

            {futureIndex >= 0 ? (
              <rect
                x={futureStartX}
                y="14"
                width={width - RIGHT - futureStartX}
                height={barBaseline + 54 - 14}
                rx="12"
                className={styles.futureZone}
              />
            ) : null}

            {yTicks.map((value) => (
              <g key={`capacity-${value}`}>
                <line x1={leftMargin} y1={barY(value)} x2={width - RIGHT} y2={barY(value)} className={styles.cashGridLine} />
                <text x={leftMargin - 8} y={barY(value) + 4} textAnchor="end" className={styles.cashAxisLabel}>
                  {formatCashFlowAxisTick(value)}
                </text>
              </g>
            ))}

            {renderedMonths.map((month, index) => {
              const x = centerX(index);
              const active = inspection?.month === month.source.month;
              const segments = layoutCashFlowBarSegments(
                cashFlowBarSegments(month),
                ceiling,
                barBaseline,
                plotHeight,
              );
              const visualTop = segments.length
                ? Math.min(...segments.map((segment) => segment.y))
                : barBaseline;
              const logicalTop = barY(Math.max(month.income, month.total));
              const outline = selectionFrame(
                Math.min(logicalTop, visualTop),
                barBaseline,
              );
              const hitWidth = Math.min(
                monthBand - 8,
                Math.max(44, monthBand * 0.82),
              );

              return (
                <g
                  key={month.source.month}
                  id={`cash-flow-month-${index}`}
                  role="option"
                  aria-selected={active}
                  aria-label={describeRenderedMonth(month, report.currency)}
                  data-testid={`month-group-${month.source.month}`}
                  className={styles.monthGroup}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") inspectMonth(month.source.month, "hover");
                  }}
                  onPointerDown={(event) => handleMonthPointerDown(event, month.source.month)}
                  onPointerUp={(event) => handleMonthPointerUp(event, month.source.month)}
                  onPointerCancel={() => { pointerStartRef.current = null; }}
                >
                  <rect x={x - hitWidth / 2} y={BAR_TOP - 24} width={hitWidth} height={plotHeight + 80} fill="transparent" className={styles.monthHitArea} />
                  {segments.map((segment) => (
                    <g key={segment.key} data-testid={`segment-${month.source.month}-${segment.key}`}>
                      {segment.roundTop ? (
                        <path
                          d={roundedTopPath(
                            x - barWidth / 2,
                            segment.y,
                            barWidth,
                            segment.paintHeight,
                          )}
                          fill={segment.color}
                          className={styles.barSegment}
                        />
                      ) : (
                        <rect
                          x={x - barWidth / 2}
                          y={segment.y}
                          width={barWidth}
                          height={segment.paintHeight}
                          fill={segment.color}
                          className={styles.barSegment}
                        />
                      )}
                    </g>
                  ))}
                  {month.type === "current" ? (
                    <rect x={x - barWidth / 2 - 4} y={outline.y} width={barWidth + 8} height={outline.height} rx="7" className={styles.currentOutline} />
                  ) : active ? (
                    <rect data-testid={`selection-${month.source.month}`} x={x - barWidth / 2 - 4} y={outline.y} width={barWidth + 8} height={outline.height} rx="7" className={styles.selectionOutline} />
                  ) : null}
                  <text x={x} y={barBaseline + 23} textAnchor="middle" className={`${styles.monthLabel} ${month.type === "current" || month.source.month.endsWith("-01") ? styles.strongMonthLabel : ""}`}>
                    {formatMonth(month.source.month, false)}
                  </text>
                  {month.source.month.endsWith("-01") ? <text x={x} y={barBaseline + 37} textAnchor="middle" className={styles.yearLabel}>{month.source.month.slice(0, 4)}</text> : null}
                  {month.type === "current" ? <text x={x} y={barBaseline + (month.source.month.endsWith("-01") ? 50 : 37)} textAnchor="middle" className={styles.currentMonthLabel}>CURRENT</text> : null}
                </g>
              );
            })}
            </svg>

            {forecastPanel}

            {selectedShowsTooltip && selected ? (
              <ChartTooltip
                ref={tooltipRef}
                id="cash-flow-tooltip"
                title={formatMonth(selected.source.month)}
                detail={formatMoney(selected.income, report.currency)}
                detailLabel={selected.type === "current" ? "Current month" : "Income"}
                rows={tooltipRows(selected, report.currency)}
              />
            ) : null}
          </div>
        </div>

      <p className={styles.srOnly} id="cash-flow-active-month" aria-live="polite">
        {inspection ? selectedDescription : "Use the Left and Right Arrow keys to inspect monthly cash flow."}
      </p>
      <table className={styles.srOnlyTable}>
        <caption>Monthly cash flow in {report.currency}</caption>
        <thead><tr><th>Month</th><th>Income</th><th>Fixed</th><th>Living</th><th>Debt</th><th>Investment capacity</th></tr></thead>
        <tbody>{months.map((month) => <tr key={month.month}><th scope="row">{month.label}</th><td>{month.income}</td><td>{month.fixed_costs}</td><td>{month.living_costs}</td><td>{month.debt_installments}</td><td>{month.investment_capacity}</td></tr>)}</tbody>
      </table>
    </Box>
  );
}
