"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { TransactionChipClickHandler } from "./types";

type ChipShellProps = {
  children: ReactNode;
  dotColor?: string;
  icon?: ReactNode;
  borderColor?: string;
  borderStyle?: "solid" | "dashed";
  background?: string;
  color?: string;
  label: string;
  onClick?: TransactionChipClickHandler;
};

export function ChipShell({
  children,
  dotColor = "text.tertiary",
  icon,
  borderColor = "chip.border",
  borderStyle = "solid",
  background = "chip.bg",
  color = "chip.text",
  label,
  onClick,
}: ChipShellProps) {
  const isButton = Boolean(onClick);
  const content = (
    <>
      {icon ?? (
        <Box
          aria-hidden="true"
          bg={dotColor}
          borderRadius="full"
          flex="0 0 5px"
          h="5px"
          w="5px"
        />
      )}
      <Text as="span">{label}</Text>
      {children}
    </>
  );

  return (
    <Flex
      align="center"
      asChild
      bg={background}
      borderColor={borderColor}
      borderRadius="999px"
      borderStyle={borderStyle}
      borderWidth="1px"
      color={color}
      cursor={isButton ? "pointer" : "default"}
      display="inline-flex"
      fontSize="10.5px"
      fontWeight="720"
      gap="5px"
      lineHeight="1"
      minH="23px"
      px="8px"
      py="3px"
      transition="border-color 140ms ease, background 140ms ease, color 140ms ease"
      whiteSpace="nowrap"
      _hover={
        isButton
          ? {
              borderColor: "chip.borderHover",
              bg: "chip.bgHover",
            }
          : undefined
      }
      _focusVisible={
        isButton
          ? {
              outline: "3px solid rgba(49, 95, 85, 0.24)",
              outlineOffset: "2px",
            }
          : undefined
      }
    >
      {isButton ? (
        <button type="button" onClick={onClick}>
          {content}
        </button>
      ) : (
        <span>{content}</span>
      )}
    </Flex>
  );
}
