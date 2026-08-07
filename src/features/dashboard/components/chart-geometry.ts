export type ChartSize = {
  width: number;
  height: number;
};

export type ChartMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type TooltipPlacement = {
  left: number;
  top: number;
  caretLeft: number;
};

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function wealthChartMargins(width: number): ChartMargins {
  return width < 540
    ? { top: 24, right: 12, bottom: 54, left: 44 }
    : { top: 24, right: 14, bottom: 44, left: 60 };
}

export function placeTooltip({
  anchorX,
  anchorY,
  containerWidth,
  tooltipWidth,
  tooltipHeight,
  clearance,
  gutter = 8,
}: {
  anchorX: number;
  anchorY: number;
  containerWidth: number;
  tooltipWidth: number;
  tooltipHeight: number;
  clearance: number;
  gutter?: number;
}): TooltipPlacement {
  const left = clamp(
    anchorX - tooltipWidth / 2,
    gutter,
    Math.max(gutter, containerWidth - tooltipWidth - gutter),
  );

  return {
    left,
    top: Math.max(gutter, anchorY - tooltipHeight - clearance),
    caretLeft: clamp(anchorX - left, 14, tooltipWidth - 14),
  };
}
