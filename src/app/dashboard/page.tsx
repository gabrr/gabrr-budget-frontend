"use client";

import { Box, Container, Text } from "@chakra-ui/react";

export default function DashboardPage() {
  return (
    <Box as="main" layerStyle="page" p={8}>
      <Text as="h1" textStyle="pageTitle">
        Dashboard
      </Text>

      <Container centerContent></Container>
    </Box>
  );
}
