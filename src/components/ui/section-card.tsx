import { Box, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type SectionCardProps = {
  actions?: ReactNode;
  children: ReactNode;
  eyebrow?: string;
  meta?: string;
  subtitle?: string;
  title: string;
};

export function SectionCard({
  actions,
  children,
  eyebrow,
  meta,
  subtitle,
  title,
}: SectionCardProps) {
  return (
    <Stack
      bg="bg.surface"
      borderColor="border.subtle"
      borderRadius="20px"
      borderWidth="1px"
      boxShadow="0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 30px rgba(0, 0, 0, 0.05)"
      gap="0"
      minW="0"
      overflow="hidden"
    >
      <Flex
        align={{ base: "stretch", md: "flex-start" }}
        borderBottomColor="border.subtle"
        borderBottomWidth="1px"
        direction={{ base: "column", md: "row" }}
        gap="3"
        justify="space-between"
        px={{ base: "4", md: "5" }}
        py={{ base: "4", md: "5" }}
      >
        <Stack gap="2" minW="0">
          {eyebrow ? (
            <Text
              color="text.tertiary"
              fontSize="10px"
              fontWeight="820"
              letterSpacing="0.08em"
              lineHeight="1"
              textTransform="uppercase"
            >
              {eyebrow}
            </Text>
          ) : null}
          <Heading
            as="h2"
            color="text.primary"
            fontSize={{ base: "18px", md: "20px" }}
            fontWeight="780"
            letterSpacing="0"
            lineHeight="1.15"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {title}
          </Heading>
          {subtitle ? (
            <Text color="text.secondary" fontSize="13px" lineHeight="1.4">
              {subtitle}
            </Text>
          ) : null}
          {meta ? (
            <Text color="text.tertiary" fontSize="12px" fontWeight="720">
              {meta}
            </Text>
          ) : null}
        </Stack>

        {actions ? (
          <Box alignSelf={{ base: "flex-start", md: "center" }}>{actions}</Box>
        ) : null}
      </Flex>

      <Box p={{ base: "4", md: "5" }}>{children}</Box>
    </Stack>
  );
}
