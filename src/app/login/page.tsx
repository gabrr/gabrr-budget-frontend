"use client";

import { browserAuth } from "@/auth/browser";
import { Box, Button, Container, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("g.webdevelopr@gmail.com");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(
    searchParams.get("error") ? "That sign-in link is invalid or expired." : null,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSending(true);
    setMessage(null);

    const next = searchParams.get("next") ?? "/dashboard";
    const callback = new URL("/auth/confirm", window.location.origin);
    callback.searchParams.set("next", next.startsWith("/") ? next : "/dashboard");

    try {
      await browserAuth.sendMagicLink(
        email.trim().toLowerCase(),
        callback.toString(),
      );
      setMessage("Check your inbox for your secure sign-in link.");
    } catch {
      setMessage("We could not send the sign-in link. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Box as="main" layerStyle="page" minH="100vh" display="grid" placeItems="center">
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

          <Box as="form" onSubmit={handleSubmit} layerStyle="panel">
            <Stack gap="4">
              <Box>
                <label htmlFor="email">Email</label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  mt="2"
                />
              </Box>
              <Button type="submit" loading={isSending}>
                Send magic link
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
