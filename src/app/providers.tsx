"use client";

import { Toaster } from "@/components/toaster";
import { system } from "@/theme";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";

function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;

  if (error && typeof error === "object" && "status" in error) {
    const status = Number(error.status);
    if (status >= 400 && status < 500) return false;
  }

  return true;
}

export default function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: shouldRetry,
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ChakraProvider>
  );
}
