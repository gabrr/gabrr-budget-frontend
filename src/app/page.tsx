"use client";

import { SmallAddIcon } from "@chakra-ui/icons";
import { Button, Container, Heading } from "@chakra-ui/react";
import NextLink from "next/link";

export default function Home() {
  return (
    <Container py={16} centerContent gap={6}>
      <Heading>Gabrr Budget AI</Heading>
      <NextLink href="/import">
        <Button as="a" color="AccentColor" size="md">
          Import
          <SmallAddIcon />
        </Button>
      </NextLink>
    </Container>
  );
}
