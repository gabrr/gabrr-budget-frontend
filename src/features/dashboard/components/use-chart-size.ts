"use client";

import { useLayoutEffect, useRef, useState } from "react";

import type { ChartSize } from "./chart-geometry";

export function useChartSize<T extends HTMLElement>(fallback: ChartSize) {
  const elementRef = useRef<T>(null);
  const [size, setSize] = useState(fallback);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const updateSize = () => {
      const next = {
        width: Math.max(280, element.clientWidth),
        height: Math.max(280, element.clientHeight),
      };
      setSize((current) => current.width === next.width && current.height === next.height
        ? current
        : next);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { elementRef, size };
}
