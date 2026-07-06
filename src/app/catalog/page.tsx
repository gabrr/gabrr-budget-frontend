"use client";

import { Box, Container, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import {
  BucketChip,
  CategoryChip,
  ConfidenceChip,
  bucketChipValues,
  categoryChipValues,
} from "@/components/ui/chips";

const confidenceSamples = [0.86, 0.62, 0.42];

export default function CatalogPage() {
  return (
    <Box as="main" layerStyle="page" minH="100vh">
      <Container maxW="1180px" px={{ base: "5", md: "8" }} py={{ base: "6", md: "8" }}>
        <Stack gap={{ base: "5", md: "6" }}>
          <Flex
            align={{ base: "flex-start", md: "flex-end" }}
            direction={{ base: "column", md: "row" }}
            gap="4"
            justify="space-between"
          >
            <Stack gap="2">
              <Heading
                as="h1"
                color="#141a18"
                fontSize={{ base: "30px", md: "42px" }}
                fontWeight="740"
                letterSpacing="0"
                lineHeight="1.04"
              >
                Transaction chip catalog
              </Heading>
              <Text color="#69736f" fontSize="14px" lineHeight="1.45" maxW="720px">
                Category, bucket, and confidence chips for transaction review.
              </Text>
            </Stack>

            <Box
              bg="#fff"
              borderColor="#dfe5e1"
              borderRadius="999px"
              borderWidth="1px"
              color="#69736f"
              fontSize="12px"
              fontWeight="720"
              minH="34px"
              px="12px"
              py="7px"
              whiteSpace="nowrap"
            >
              presentation components
            </Box>
          </Flex>

          <CatalogPanel title="Categories">
            <ChipWrap>
              {categoryChipValues.map((value) => (
                <CategoryChip key={value} value={value} />
              ))}
            </ChipWrap>
          </CatalogPanel>

          <CatalogPanel title="Buckets">
            <ChipWrap>
              {bucketChipValues.map((value) => (
                <BucketChip key={value} value={value} />
              ))}
            </ChipWrap>
          </CatalogPanel>

          <CatalogPanel title="Confidence">
            <ChipWrap>
              {confidenceSamples.map((value) => (
                <ConfidenceChip key={value} value={value} />
              ))}
            </ChipWrap>
          </CatalogPanel>

          <CatalogPanel title="Clickable">
            <ChipWrap>
              <CategoryChip value="transportation" onClick={() => console.log("transportation")} />
              <BucketChip value="unknown" onClick={() => console.log("unknown")} />
              <ConfidenceChip value={0.42} onClick={() => console.log("low confidence")} />
            </ChipWrap>
          </CatalogPanel>
        </Stack>
      </Container>
    </Box>
  );
}

function CatalogPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <Stack
      as="section"
      bg="rgba(255, 255, 255, 0.9)"
      borderColor="#e1e5e2"
      borderRadius="18px"
      borderWidth="1px"
      gap="4"
      p={{ base: "4", md: "5" }}
    >
      <Heading
        as="h2"
        color="#141a18"
        fontSize="16px"
        fontWeight="780"
        letterSpacing="0"
      >
        {title}
      </Heading>
      {children}
    </Stack>
  );
}

function ChipWrap({ children }: { children: ReactNode }) {
  return (
    <Flex align="center" gap="5px" wrap="wrap">
      {children}
    </Flex>
  );
}
