"use client";

import { Box, Button, Toggle, type ButtonProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { ChipIcon } from "./chip";

const control = {
  h: "36px",
  minH: "36px",
  px: "10px",
  py: "6px",
  gap: "6px",
  border: "1px solid transparent",
  borderRadius: "control",
  bg: "chip.filter",
  color: "white",
  fontFamily: "interface",
  fontSize: "12px",
  fontWeight: "600",
  lineHeight: "16px",
  whiteSpace: "nowrap",
  _hover: { bg: "ink" },
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
  _highContrast: {
    borderColor: "CanvasText",
    bg: "Canvas",
    color: "CanvasText",
  },
} as const;

function Label({ children }: { children: ReactNode }) {
  return (
    <Box
      as="span"
      minW="0"
      overflow="hidden"
      textOverflow="ellipsis"
      whiteSpace="nowrap"
    >
      {children}
    </Box>
  );
}

export function DisclosureChip({
  leading,
  label,
  meta,
  ...props
}: Omit<ButtonProps, "children"> & {
  leading?: ReactNode;
  label: string;
  meta?: string;
}) {
  return (
    <Button {...props} {...control}>
      {leading}
      <Label>{label}</Label>
      {meta ? (
        <Box
          as="span"
          color="inherit"
          fontVariantNumeric="tabular-nums"
          opacity="0.72"
          _highContrast={{ opacity: 1 }}
        >
          {meta}
        </Box>
      ) : null}
    </Button>
  );
}

export function FilterChip({
  label,
  pressed,
  onPressedChange,
  disabled = false,
}: {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Toggle.Root
      {...control}
      pressed={pressed}
      disabled={disabled}
      onPressedChange={onPressedChange}
      _pressed={{
        bg: "chip.filterSelected",
        _hover: { bg: "chip.filterSelected" },
      }}
      _highContrast={{
        borderColor: "CanvasText",
        bg: "Canvas",
        color: "CanvasText",
        _pressed: {
          borderColor: "Highlight",
          bg: "Highlight",
          color: "HighlightText",
        },
      }}
    >
      <ChipIcon
        src={disabled
          ? "/brand/icons/minus.svg"
          : pressed
            ? "/brand/icons/check.svg"
            : "/brand/icons/plus.svg"}
      />
      <Label>{label}</Label>
    </Toggle.Root>
  );
}

type FilterMenuChipProps = Omit<ButtonProps, "children"> & {
  label: string;
  icon: string;
  "aria-haspopup": "dialog" | "menu" | "listbox";
  "aria-expanded": boolean;
};

export function FilterMenuChip({ label, icon, ...props }: FilterMenuChipProps) {
  return (
    <Button {...props} {...control}>
      <ChipIcon src={icon} />
      <Label>{label}</Label>
      <ChipIcon src="/brand/icons/caret-down.svg" />
    </Button>
  );
}

export function AppliedFilterChip({
  label,
  icon,
  onRemove,
}: {
  label: string;
  icon: string;
  onRemove: () => void;
}) {
  return (
    <Button
      {...control}
      bg="chip.filterSelected"
      aria-label={`${label}, remove filter`}
      onClick={onRemove}
      _hover={{ bg: "chip.filterSelected" }}
      _highContrast={{
        borderColor: "Highlight",
        bg: "Highlight",
        color: "HighlightText",
      }}
    >
      <ChipIcon src={icon} />
      <Label>{label}</Label>
      <ChipIcon src="/brand/icons/x.svg" />
    </Button>
  );
}
