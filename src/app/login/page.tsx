"use client";

import { browserAuth } from "@/auth/browser";
import { safeAuthDestination } from "@/auth/redirect";
import { Box, Button, Container, Heading, Stack, Text } from "@chakra-ui/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [message, setMessage] = useState<string | null>(
    searchParams.get("error")
      ? "Sign-in was canceled or could not be completed."
      : null,
  );

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setMessage(null);

    const next = safeAuthDestination(searchParams.get("next"));
    const callback = new URL("/auth/confirm", window.location.origin);
    callback.searchParams.set("next", next);

    try {
      await browserAuth.startSocialSignIn("google", callback.toString());
    } catch {
      setMessage("Google sign-in could not be started. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <Box
      as="main"
      layerStyle="page"
      minH="100vh"
      display="grid"
      placeItems="center"
    >
      <Container maxW="md" px="6" py="12">
        <Stack gap="7">
          <Box>
            <Heading as="h1" textStyle="pageTitle">
              Gabrr Budget
            </Heading>
            <Text color="text.secondary" mt="2">
              Sign in to continue.
            </Text>
          </Box>

          <Box layerStyle="panel">
            <Stack gap="4">
              <Button
                type="button"
                color={"colorPalette.200"}
                loading={isSigningIn}
                onClick={handleGoogleSignIn}
              >
                Continue with Google
              </Button>
              {message && (
                <Text color="text.secondary" role="status">
                  {message}
                </Text>
              )}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
