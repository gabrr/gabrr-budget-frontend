"use client";

import { Button, type ButtonProps } from "@chakra-ui/react";
import { forwardRef, type ReactNode } from "react";

import { ChipIcon } from "../chips";

export type ActionTone = "primary" | "secondary" | "danger";

const TONE: Record<ActionTone, { bg: string; color: string; hover: string }> = {
  primary: { bg: "ink", color: "canvas", hover: "graphite" },
  secondary: { bg: "selected", color: "ink", hover: "ruleSoft" },
  danger: { bg: "oxblood", color: "canvas", hover: "cashDebt" },
};

const base = {
  h: "36px",
  minH: "36px",
  px: "10px",
  gap: "6px",
  border: "1px solid transparent",
  borderRadius: "control",
  fontFamily: "interface",
  fontSize: "12px",
  fontWeight: "600",
  lineHeight: "16px",
  whiteSpace: "nowrap",
  transition: "background-color 160ms, color 160ms, transform 160ms",
  _active: { transform: "scale(.98)" },
  _focusVisible: {
    outline: "2px solid",
    outlineColor: "horizonDeep",
    outlineOffset: "3px",
  },
  _disabled: {
    bg: "chip.disabledBg",
    color: "chip.disabledText",
    cursor: "not-allowed",
    opacity: 1,
  },
  _motionReduce: { transitionDuration: "0.001ms", transform: "none" },
} as const;

type ActionButtonProps = Omit<ButtonProps, "children"> & {
  children: ReactNode;
  tone?: ActionTone;
  icon?: string;
};

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  function ActionButton({ children, tone = "primary", icon, ...props }, ref) {
    const colors = TONE[tone];
    return (
      <Button
        ref={ref}
        type="button"
        {...props}
        {...base}
        bg={colors.bg}
        color={colors.color}
        _hover={{ bg: colors.hover }}
        _highContrast={{
          borderColor: tone === "danger" ? "LinkText" : "CanvasText",
          bg: tone === "danger" ? "LinkText" : "Canvas",
          color: tone === "danger" ? "Canvas" : "CanvasText",
        }}
      >
        {icon ? <ChipIcon src={icon} /> : null}
        {children}
      </Button>
    );
  },
);

type IconActionButtonProps = Omit<ButtonProps, "children" | "aria-label"> & {
  "aria-label": string;
  icon: string;
};

export const IconActionButton = forwardRef<HTMLButtonElement, IconActionButtonProps>(
  function IconActionButton({ icon, ...props }, ref) {
    return (
      <Button
        ref={ref}
        type="button"
        {...props}
        {...base}
        w="36px"
        minW="36px"
        p="0"
        bg="selected"
        color="ink"
        _hover={{ bg: "ruleSoft" }}
        _highContrast={{
          borderColor: "CanvasText",
          bg: "Canvas",
          color: "CanvasText",
        }}
      >
        <ChipIcon src={icon} />
      </Button>
    );
  },
);
