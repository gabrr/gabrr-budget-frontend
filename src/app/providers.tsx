"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { ColorModeProvider } from "@/components/color-mode";
import { Toaster } from "@/components/toaster";
import { system } from "@/theme";
import type { PropsWithChildren } from "react";

export default function Providers({ children }: PropsWithChildren) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider>
        {children}
        <Toaster />
      </ColorModeProvider>
    </ChakraProvider>
  );
}
