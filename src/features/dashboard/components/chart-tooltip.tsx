import { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";

import tooltipStyles from "./chart-tooltip.module.css";

export type ChartTooltipIndicator =
  | "current"
  | "goal"
  | "fixed"
  | "variable"
  | "debt"
  | "invested";

export type ChartTooltipRow = {
  label: string;
  value: string;
  indicator?: ChartTooltipIndicator;
  divider?: boolean;
};

type ChartTooltipProps = {
  title: string;
  detail?: ReactNode;
  detailLabel?: string;
  rows: ChartTooltipRow[];
  withCaret?: boolean;
  compactOnMobile?: boolean;
  style?: CSSProperties;
  id?: string;
};

export const ChartTooltip = forwardRef<HTMLDivElement, ChartTooltipProps>(
  function ChartTooltip(
    { title, detail, detailLabel, rows, withCaret = false, compactOnMobile = false, style, id },
    ref,
  ) {
    return (
      <div
        ref={ref}
        id={id}
        className={`${tooltipStyles.tooltip} ${withCaret ? tooltipStyles.withCaret : ""} ${compactOnMobile ? tooltipStyles.compactOnMobile : ""}`}
        role="tooltip"
        style={style}
      >
        <div className={tooltipStyles.title}>
          <span>{title}</span>
          {detail ? (
            <span className={tooltipStyles.titleDetail}>
              {detailLabel ? <small>{detailLabel}</small> : null}
              {detail}
            </span>
          ) : null}
        </div>
        <dl>
          {rows.map((row) => (
            <div
              key={row.label}
              className={`${tooltipStyles.row} ${row.divider ? tooltipStyles.divider : ""}`}
              data-kind={row.indicator}
            >
              <dt>
                {row.indicator ? (
                  <i
                    className={tooltipStyles.indicator}
                    data-kind={row.indicator}
                    aria-hidden="true"
                  />
                ) : null}
                {row.label}
              </dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  },
);
