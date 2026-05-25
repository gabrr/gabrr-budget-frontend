"use client";

import { SmallAddIcon } from "@chakra-ui/icons";
import { Button, Container, Heading } from "@chakra-ui/react";
import NextLink from "next/link";

export default function Home() {
  return (
    <Container py={16} centerContent gap={6}>
      <Heading>Gabrr Budget AI</Heading>
      <Button asChild color="AccentColor" size="md">
        <NextLink href="/import">
          Import
          <SmallAddIcon />
        </NextLink>
      </Button>
    </Container>
  );
}
