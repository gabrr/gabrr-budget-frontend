"use client";

import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useMemo } from "react";

const COLOR_MODE_STORAGE_KEY = "gabrr-color-mode";
const LEGACY_COLOR_MODE_STORAGE_KEY = "theme";

type UseColorModeReturn = {
  colorMode: "light" | "dark";
  setColorMode: (value: "light" | "dark" | "system") => void;
  toggleColorMode: () => void;
};

export function ColorModeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={COLOR_MODE_STORAGE_KEY}
      disableTransitionOnChange
      {...props}
    >
      <SystemColorModeSync />
      {children}
    </ThemeProvider>
  );
}

function SystemColorModeSync() {
  const { setTheme } = useTheme();

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_COLOR_MODE_STORAGE_KEY);
    setTheme("system");
  }, [setTheme]);

  return null;
}

export function useColorMode(): UseColorModeReturn {
  const { resolvedTheme, systemTheme, theme, setTheme } = useTheme();

  const colorMode = useMemo(() => {
    if (resolvedTheme === "dark" || resolvedTheme === "light") {
      return resolvedTheme;
    }
    if (theme === "system") {
      return systemTheme === "dark" ? "dark" : "light";
    }
    return theme === "dark" ? "dark" : "light";
  }, [resolvedTheme, theme, systemTheme]);

  const toggleColorMode = () => {
    setTheme(colorMode === "dark" ? "light" : "dark");
  };

  return { colorMode, setColorMode: setTheme, toggleColorMode };
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { colorMode } = useColorMode();
  return colorMode === "dark" ? dark : light;
}
