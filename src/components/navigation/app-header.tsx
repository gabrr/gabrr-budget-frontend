"use client";

import { browserAuth } from "@/auth/browser";
import { Box, Button, Container, Grid, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type NavigationItem = {
  href: string;
  label: string;
  secondary?: boolean;
};

const navigationItems: readonly NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/import", label: "Import" },
  { href: "/processes", label: "Processes" },
  { href: "/catalog", label: "Catalog", secondary: true },
];

const publicPaths = new Set(["/login", "/auth/confirm"]);

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (publicPaths.has(pathname)) return null;

  return (
    <Box
      as="header"
      bg="bg.surface"
      borderBottomColor="border.subtle"
      borderBottomWidth="1px"
      position="sticky"
      top="0"
      zIndex="sticky"
    >
      <Container maxW="1280px" px={{ base: "4", md: "6" }}>
        <Grid
          alignItems="center"
          columnGap={{ base: "4", md: "6" }}
          gridTemplateColumns={{ base: "1fr auto", md: "auto 1fr auto" }}
          minH={{ base: "92px", md: "64px" }}
        >
          <Link
            asChild
            color="text.primary"
            fontSize="15px"
            fontWeight="800"
            gridColumn="1"
            gridRow="1"
            letterSpacing="0"
            textDecoration="none"
          >
            <NextLink href="/dashboard">Gabrr Budget</NextLink>
          </Link>

          <Box
            as="nav"
            aria-label="Main navigation"
            display="flex"
            gap="3"
            gridColumn={{ base: "1 / -1", md: "2" }}
            gridRow={{ base: "2", md: "1" }}
            minW="0"
            p={"3"}
            overflowX="auto"
            scrollbarWidth="none"
          >
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  asChild
                  aria-current={isActive ? "page" : undefined}
                  bg={isActive ? "bg.control" : "transparent"}
                  borderRadius="6px"
                  color={
                    isActive
                      ? "text.primary"
                      : item.secondary
                        ? "text.tertiary"
                        : "text.secondary"
                  }
                  flexShrink="0"
                  fontSize="14px"
                  fontWeight={"600"}
                  minH="36px"
                  px="3"
                  textDecoration="none"
                  transition="background 120ms ease, color 120ms ease"
                  _hover={{
                    bg: "bg.control",
                    color: "text.primary",
                    textDecoration: "none",
                  }}
                  _focusVisible={{
                    outline: "2px solid gray",
                    outlineColor: "accent.blue",
                    outlineOffset: "2px",
                  }}
                >
                  <NextLink href={item.href}>{item.label}</NextLink>
                </Link>
              );
            })}
          </Box>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            gridColumn={{ base: "2", md: "3" }}
            gridRow="1"
            loading={isSigningOut}
            onClick={async () => {
              setIsSigningOut(true);
              try {
                await browserAuth.signOut();
                router.replace("/login");
                router.refresh();
              } finally {
                setIsSigningOut(false);
              }
            }}
          >
            Sign out
          </Button>
        </Grid>
      </Container>
    </Box>
  );
}
