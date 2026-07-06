"use client";

import { Box, Button, Container, Heading } from "@chakra-ui/react";
import Link from "next/link";

export default function Home() {
  return (
    <Box as="main" layerStyle="page">
      <Container p={8}>
        <Heading as={"h1"} textStyle="pageTitle">
          Home
        </Heading>

        <Box
          mt="8"
          display="flex"
          flexDirection="row"
          gap="4"
          maxWidth={300}
          alignItems={"center"}
        >
          <Button asChild>
            <Link href={"/"}>Home</Link>
          </Button>

          <Button asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild>
            <Link href="/catalog">Catalog</Link>
          </Button>
          <Button asChild>
            <Link href="/import">Import</Link>
          </Button>
          <Button asChild>
            <Link href="/processes">Processes</Link>
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
