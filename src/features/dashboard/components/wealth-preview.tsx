"use client";

import { Box, Text } from "@chakra-ui/react";
import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import {
  activeHorizons,
  formatChartMoney,
  formatMoney,
  horizonLabel,
  niceStep,
} from "../model";
import type {
  GoalScenario,
  ScenarioBasis,
  WealthProjection,
} from "../types";
import { ChartTooltip } from "./chart-tooltip";
import {
  clamp,
  placeTooltip,
  wealthChartMargins,
} from "./chart-geometry";
import { useChartSize } from "./use-chart-size";
import styles from "../dashboard.module.css";

type WealthPreviewProps = {
  basis: ScenarioBasis;
  projection: WealthProjection;
  scenario: GoalScenario;
};

type TooltipStyle = CSSProperties & {
  "--tooltip-caret-left": string;
};

const FALLBACK_CHART_SIZE = { width: 1000, height: 430 };

export function WealthPreview({
  basis,
  projection,
  scenario,
}: WealthPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [isInspecting, setIsInspecting] = useState(false);
  const [tooltipSize, setTooltipSize] = useState({ width: 232, height: 126 });
  const scrubberRef = useRef<HTMLInputElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const pointerTypeRef = useRef("mouse");
  const { elementRef: chartRef, size } = useChartSize<HTMLDivElement>(FALLBACK_CHART_SIZE);

  const width = size.width;
  const height = size.height;
  const mobile = width < 540;
  const margin = wealthChartMargins(width);
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const horizons = activeHorizons(scenario, basis);
  const resolvedIndex = clamp(selectedIndex, 0, horizons.length - 1);
  const selectedMonths = horizons[resolvedIndex] ?? 0;
  const currentPoints = horizons.map((month) => projection.current[month]);
  const goalPoints = horizons.map((month) => projection.goal[month]);
  const values = [...currentPoints, ...goalPoints].map((point) => point.value);
  const maxRaw = Math.max(1, ...values);
  const step = niceStep(maxRaw, 12);
  const maxValue = Math.ceil(maxRaw / step) * step;
  const x = (index: number) =>
    margin.left + (index / Math.max(1, horizons.length - 1)) * plotWidth;
  const y = (value: number) =>
    margin.top + ((maxValue - value) / maxValue) * plotHeight;
  const totalMonths = (scenario.retirementAge - basis.currentAge) * 12;
  const currentPoint = currentPoints[resolvedIndex];
  const goalPoint = goalPoints[resolvedIndex];
  const selectedX = x(resolvedIndex);
  const selectedY = Math.min(y(currentPoint.value), y(goalPoint.value));

  const currentPath = currentPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`)
    .join(" ");
  const goalPath = goalPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`)
    .join(" ");

  const focusMonths = [0, 3, 6, 9, 12].filter((month) => month <= totalMonths);
  const firstYearValues = projection.current
    .slice(0, Math.min(13, projection.current.length))
    .concat(projection.goal.slice(0, Math.min(13, projection.goal.length)))
    .map((point) => point.value)
    .filter(Number.isFinite);
  const focusRawMin = Math.min(...firstYearValues);
  const focusRawMax = Math.max(...firstYearValues);
  const focusRawSpan = Math.max(0, focusRawMax - focusRawMin);
  const focusMovementPx = maxValue > 0 ? (focusRawSpan / maxValue) * plotHeight : plotHeight;
  const maxFocusDifference = Math.max(...focusMonths.map((month) => Math.abs(
    projection.current[month].value - projection.goal[month].value,
  )));
  const focusDifferencePx = maxValue > 0
    ? (maxFocusDifference / maxValue) * plotHeight
    : plotHeight;
  const showFocusLens = focusMonths.length > 2
    && focusRawSpan > 0
    && (focusMovementPx < 44 || (maxFocusDifference >= 1 && focusDifferencePx < 10))
    && plotHeight >= 250;

  const focusStep = niceStep(Math.max(focusRawSpan, 25_000), 10);
  let focusMin = Math.max(
    0,
    Math.floor((focusRawMin - focusStep * 0.5) / focusStep) * focusStep,
  );
  let focusMax = Math.max(
    focusMin + focusStep,
    Math.ceil((focusRawMax + focusStep * 0.5) / focusStep) * focusStep,
  );
  if ((focusMax - focusMin) / focusStep < 5) {
    focusMin = Math.max(
      0,
      Math.floor((focusRawMin - focusStep * 2) / focusStep) * focusStep,
    );
    focusMax = Math.max(
      focusMin + focusStep * 5,
      Math.ceil((focusRawMax + focusStep * 2) / focusStep) * focusStep,
    );
  }

  const lensWidth = mobile
    ? Math.min(198, Math.max(156, plotWidth * 0.72))
    : Math.min(300, Math.max(220, plotWidth * 0.32));
  const lensHeight = mobile ? 142 : 158;
  const lensX = margin.left + (mobile ? 8 : 12);
  const lensY = margin.top + 10;
  const lensPadding = mobile
    ? { top: 28, right: 9, bottom: 23, left: 38 }
    : { top: 30, right: 12, bottom: 24, left: 46 };
  const focusLeft = lensX + lensPadding.left;
  const focusTop = lensY + lensPadding.top;
  const focusWidth = lensWidth - lensPadding.left - lensPadding.right;
  const focusHeight = lensHeight - lensPadding.top - lensPadding.bottom;
  const focusX = (month: number) => focusLeft + (month / 12) * focusWidth;
  const focusY = (value: number) =>
    focusTop + ((focusMax - value) / (focusMax - focusMin)) * focusHeight;
  const focusCurrentPath = focusMonths
    .map((month, index) => `${index === 0 ? "M" : "L"} ${focusX(month)} ${focusY(projection.current[month].value)}`)
    .join(" ");
  const focusGoalPath = focusMonths
    .map((month, index) => `${index === 0 ? "M" : "L"} ${focusX(month)} ${focusY(projection.goal[month].value)}`)
    .join(" ");

  const ticks: number[] = [];
  for (let value = 0; value <= maxValue + step / 2; value += step) ticks.push(value);
  const focusTicks: number[] = [];
  for (let value = focusMin; value <= focusMax + focusStep / 2; value += focusStep) {
    focusTicks.push(value);
  }

  const date = new Date(Date.UTC(currentPoint.year, currentPoint.monthIndex, 1));
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  const difference = currentPoint.value - goalPoint.value;
  const readableDifference = Math.abs(difference) < 1
    ? "Both paths are equal."
    : `Current investing pace is ${formatMoney(Math.abs(difference), basis.currency)} ${difference > 0 ? "above" : "below"} the goal path.`;
  const reading = `${horizonLabel(selectedMonths, scenario.retirementAge, totalMonths)}, ${dateLabel}. Current investing pace ${formatMoney(currentPoint.value, basis.currency)}. Goal investing path ${formatMoney(goalPoint.value, basis.currency)}. ${readableDifference}`;

  useLayoutEffect(() => {
    if (!isInspecting || !tooltipRef.current) return;
    const next = {
      width: tooltipRef.current.offsetWidth,
      height: tooltipRef.current.offsetHeight,
    };
    setTooltipSize((current) => current.width === next.width && current.height === next.height
      ? current
      : next);
  }, [basis.currency, dateLabel, difference, isInspecting, width]);

  const tooltipPlacement = placeTooltip({
    anchorX: selectedX,
    anchorY: selectedY,
    containerWidth: width,
    tooltipWidth: tooltipSize.width,
    tooltipHeight: tooltipSize.height,
    clearance: pointerTypeRef.current === "touch" ? 34 : 18,
  });
  const tooltipStyle: TooltipStyle = {
    left: tooltipPlacement.left,
    top: tooltipPlacement.top,
    "--tooltip-caret-left": `${tooltipPlacement.caretLeft}px`,
  };

  function selectFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    pointerTypeRef.current = event.pointerType;
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left) * (width / Math.max(1, rect.width));
    const pointerY = (event.clientY - rect.top) * (height / Math.max(1, rect.height));
    let nextIndex: number;

    if (
      showFocusLens
      && pointerX >= focusLeft - 7
      && pointerX <= focusLeft + focusWidth + 7
      && pointerY >= focusTop - 7
      && pointerY <= focusTop + focusHeight + 7
    ) {
      const progress = clamp((pointerX - focusLeft) / focusWidth, 0, 1);
      const month = focusMonths[Math.round(progress * (focusMonths.length - 1))];
      nextIndex = horizons.indexOf(month);
    } else {
      const plotX = clamp(pointerX - margin.left, 0, plotWidth);
      nextIndex = Math.round((plotX / Math.max(1, plotWidth)) * (horizons.length - 1));
    }

    setSelectedIndex((current) => current === nextIndex ? current : nextIndex);
  }

  return (
    <Box as="section" aria-labelledby="wealth-preview-title" className={styles.chartShell}>
      <header className={styles.wealthHeading}>
        <div>
          <Text className={styles.sectionLabel}>INVESTING PACE</Text>
          <h1 id="wealth-preview-title" className={styles.mainChartTitle}>Wealth Preview</h1>
        </div>
        <div className={styles.wealthHeadingMeta}>
          <p className={styles.wealthAssumptions}>
            <span>Assumptions: {Math.round(scenario.annualReturn * 100)}% annual return</span>
            <span>{scenario.inflation ? "5% inflation" : "inflation excluded"}</span>
            <span>Starting age {basis.currentAge}</span>
            <span>Today&apos;s {basis.currency}</span>
          </p>
          <div className={styles.wealthLegend} aria-label="Wealth projection legend">
            <div>
              <i className={`${styles.lineKey} ${styles.currentKey}`} aria-hidden="true" />
              <span><strong>Current investing pace</strong><small>{formatMoney(basis.averageMonthlyInvestment, basis.currency)}/month</small></span>
            </div>
            <div>
              <i className={`${styles.lineKey} ${styles.goalKey}`} aria-hidden="true" />
              <span><strong>Goal investing path</strong><small>{formatMoney(projection.required, basis.currency)}/month · age {scenario.retirementAge}</small></span>
            </div>
          </div>
        </div>
      </header>

      <div
        ref={chartRef}
        className={styles.wealthControl}
        data-inspecting={isInspecting}
        onPointerMove={(event) => {
          selectFromPointer(event);
          setIsInspecting(true);
        }}
        onPointerDown={(event) => {
          selectFromPointer(event);
          setIsInspecting(true);
          scrubberRef.current?.focus({ preventScroll: true });
        }}
        onPointerLeave={() => {
          if (document.activeElement !== scrubberRef.current) setIsInspecting(false);
        }}
      >
        <svg
          className={styles.wealthChart}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Wealth projection from today to age ${scenario.retirementAge}`}
        >
          <desc>
            Solid line: current investing pace. Dashed line: the contribution path for the retirement goal. Checkpoint horizons use equal visual intervals. Values are in today&apos;s {basis.currency}.
          </desc>
          {ticks.map((value) => (
            <g key={value}>
              <line x1={margin.left} y1={y(value)} x2={margin.left + plotWidth} y2={y(value)} className={styles.gridLine} />
              <text x={margin.left - 9} y={y(value) + 4} textAnchor="end" className={styles.axisLabel}>
                {formatChartMoney(value, basis.currency)}
              </text>
            </g>
          ))}
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotHeight} className={styles.plotDomain} />
          <line x1={margin.left} y1={margin.top + plotHeight} x2={margin.left + plotWidth} y2={margin.top + plotHeight} className={styles.plotDomain} />
          <text x={margin.left} y="11" className={styles.axisBasis}>Today&apos;s {basis.currency}</text>
          {horizons.map((months, index) => {
            const endpoint = index === 0 || index === horizons.length - 1;
            return (
              <g key={months}>
                <line x1={x(index)} y1={margin.top + plotHeight} x2={x(index)} y2={margin.top + plotHeight + 6} className={styles.plotDomain} />
                <text
                  x={x(index)}
                  y={margin.top + plotHeight + (mobile && index % 2 ? 36 : 22)}
                  textAnchor={index === 0 ? "start" : index === horizons.length - 1 ? "end" : "middle"}
                  className={`${styles.axisLabel} ${endpoint || (isInspecting && index === resolvedIndex) ? styles.selectedTick : ""}`}
                >
                  {horizonLabel(months, scenario.retirementAge, totalMonths, true)}
                </text>
              </g>
            );
          })}
          <path d={currentPath} className={styles.currentLine} />
          <path d={goalPath} className={styles.goalLine} />
          <line x1={x(horizons.length - 1)} y1={margin.top} x2={x(horizons.length - 1)} y2={margin.top + plotHeight} className={styles.retirementGuide} />

          <g className={styles.inspectionMarks}>
            <line x1={selectedX} y1={margin.top} x2={selectedX} y2={margin.top + plotHeight} className={styles.cursorLine} />
            <circle cx={selectedX} cy={y(currentPoint.value)} r="4.5" className={styles.currentDot} />
            <circle cx={selectedX} cy={y(goalPoint.value)} r="4.5" className={styles.goalDot} />
          </g>

          {showFocusLens ? (
            <g className={styles.focusLens} aria-hidden="true">
              <rect x={lensX} y={lensY} width={lensWidth} height={lensHeight} rx="10" className={styles.focusLensSurface} />
              <text x={lensX + 12} y={lensY + 17} className={styles.focusLensTitle}>First year · expanded scale</text>
              {focusTicks.map((value, index) => (
                <g key={value}>
                  <line x1={focusLeft} y1={focusY(value)} x2={focusLeft + focusWidth} y2={focusY(value)} className={styles.focusLensGrid} />
                  {index % 2 === 0 || index === focusTicks.length - 1 ? (
                    <text x={focusLeft - 6} y={focusY(value) + 3} textAnchor="end" className={styles.focusLensAxis}>
                      {formatChartMoney(value, basis.currency)}
                    </text>
                  ) : null}
                </g>
              ))}
              {focusMonths.map((month) => {
                const showLabel = !mobile || month === 0 || month === 6 || month === 12;
                return (
                  <g key={month}>
                    <line x1={focusX(month)} y1={focusTop + focusHeight} x2={focusX(month)} y2={focusTop + focusHeight + 3} className={styles.focusLensTick} />
                    {showLabel ? (
                      <text
                        x={focusX(month)}
                        y={focusTop + focusHeight + 15}
                        textAnchor={month === 0 ? "start" : month === 12 ? "end" : "middle"}
                        className={styles.focusLensAxis}
                      >
                        {month === 0 ? "Today" : month === 12 ? "1 yr" : `${month} mo`}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              <path d={focusCurrentPath} className={styles.focusLensCurrent} />
              <path d={focusGoalPath} className={styles.focusLensGoal} />
              {isInspecting && selectedMonths <= 12 ? (
                <>
                  <circle cx={focusX(selectedMonths)} cy={focusY(currentPoint.value)} r="3.25" className={styles.currentDot} />
                  <circle cx={focusX(selectedMonths)} cy={focusY(goalPoint.value)} r="3.25" className={styles.goalDot} />
                </>
              ) : null}
            </g>
          ) : null}
        </svg>

        {isInspecting ? (
          <ChartTooltip
            ref={tooltipRef}
            title={horizonLabel(selectedMonths, scenario.retirementAge, totalMonths)}
            detail={dateLabel}
            compactOnMobile
            withCaret
            style={tooltipStyle}
            rows={[
              { label: "Current investing pace", value: formatMoney(currentPoint.value, basis.currency), indicator: "current" },
              { label: "Goal investing path", value: formatMoney(goalPoint.value, basis.currency), indicator: "goal" },
              { label: "Difference", value: `${difference >= 0 ? "+" : "-"}${formatMoney(Math.abs(difference), basis.currency)}`, divider: true },
            ]}
          />
        ) : null}

        <input
          ref={scrubberRef}
          className={styles.chartScrubber}
          type="range"
          min="0"
          max={Math.max(0, horizons.length - 1)}
          step="1"
          value={resolvedIndex}
          aria-label="Wealth projection horizon"
          aria-valuetext={reading}
          onFocus={() => setIsInspecting(true)}
          onBlur={() => setIsInspecting(false)}
          onChange={(event) => setSelectedIndex(Number(event.currentTarget.value))}
        />
      </div>
      <p className={styles.srOnly}>Hover, tap, or focus the chart and use the arrow keys to inspect each available horizon.</p>
      <div className={styles.srOnly}>
        <table>
          <caption>Wealth projection by age in today&apos;s {basis.currency}</caption>
          <thead><tr><th>Age</th><th>Year</th><th>Current investing pace</th><th>Goal investing path</th></tr></thead>
          <tbody>
            {projection.current.filter((point) => point.months % 12 === 0).map((point) => (
              <tr key={point.months}>
                <th scope="row">{Math.round(point.age)}</th>
                <td>{point.year}</td>
                <td>{formatMoney(point.value, basis.currency)}</td>
                <td>{formatMoney(projection.goal[point.months].value, basis.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Box>
  );
}
