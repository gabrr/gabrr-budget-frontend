import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  globalCss: {
    "html, body": {
      bg: "bg.page",
      color: "text.primary",
    },
    body: {
      fontFamily: "var(--font-geist-sans), sans-serif",
    },
  },
  theme: {
    semanticTokens: {
      colors: {
        "bg.page": { value: { base: "#f5f5f7", _dark: "#101012" } },
        "bg.surface": { value: { base: "#ffffff", _dark: "#1c1c1e" } },
        "bg.surfaceElevated": {
          value: { base: "#fbfbfd", _dark: "#242426" },
        },
        "bg.control": { value: { base: "#f5f5f7", _dark: "#2c2c2e" } },
        "bg.controlActive": {
          value: { base: "#ffffff", _dark: "#3a3a3c" },
        },

        "text.primary": { value: { base: "#1d1d1f", _dark: "#f5f5f7" } },
        "text.secondary": { value: { base: "#6e6e73", _dark: "#a1a1a6" } },
        "text.tertiary": { value: { base: "#86868b", _dark: "#7d7d82" } },
        "text.inverse": { value: { base: "#ffffff", _dark: "#1d1d1f" } },

        "border.subtle": {
          value: {
            base: "rgba(60, 60, 67, 0.14)",
            _dark: "rgba(235, 235, 245, 0.16)",
          },
        },
        "border.strong": {
          value: {
            base: "rgba(60, 60, 67, 0.22)",
            _dark: "rgba(235, 235, 245, 0.28)",
          },
        },
        "grid.line": { value: { base: "#e5e5ea", _dark: "#3a3a3c" } },

        "accent.blue": { value: { base: "#0a84ff", _dark: "#0a84ff" } },
        "accent.blueHover": {
          value: { base: "#0071e3", _dark: "#409cff" },
        },
        "accent.blueSoft": {
          value: { base: "#eaf3ff", _dark: "rgba(10, 132, 255, 0.18)" },
        },
        "accent.bluePressed": {
          value: { base: "#005bb5", _dark: "#66b2ff" },
        },

        success: { value: { base: "#34c759", _dark: "#30d158" } },
        successSoft: {
          value: { base: "#e8f7ec", _dark: "rgba(48, 209, 88, 0.16)" },
        },
        warning: { value: { base: "#b45309", _dark: "#ffd60a" } },
        warningSoft: {
          value: { base: "#fff4df", _dark: "rgba(255, 214, 10, 0.16)" },
        },
        danger: { value: { base: "#b42318", _dark: "#ff453a" } },
        dangerSoft: {
          value: { base: "#ffe8e5", _dark: "rgba(255, 69, 58, 0.16)" },
        },

        "chart.navy": { value: { base: "#2f3a45", _dark: "#d8dee5" } },
        "chart.blueDark": { value: { base: "#5e7894", _dark: "#9fb5cb" } },
        "chart.blueMid": { value: { base: "#8fa2b5", _dark: "#7891aa" } },
        "chart.blueLight": {
          value: { base: "#d2d8e0", _dark: "#4c5f72" },
        },
        "chart.bluePale": {
          value: { base: "#eef2f6", _dark: "#27313d" },
        },

        "chip.bg": { value: { base: "#ffffff", _dark: "#242426" } },
        "chip.bgHover": { value: { base: "#fbfbfd", _dark: "#2c2c2e" } },
        "chip.border": {
          value: {
            base: "rgba(60, 60, 67, 0.14)",
            _dark: "rgba(235, 235, 245, 0.16)",
          },
        },
        "chip.borderHover": {
          value: {
            base: "rgba(60, 60, 67, 0.22)",
            _dark: "rgba(235, 235, 245, 0.28)",
          },
        },
        "chip.text": { value: { base: "#1d1d1f", _dark: "#f5f5f7" } },
      },
    },
    layerStyles: {
      page: {
        minH: "100vh",
        bg: "bg.page",
        color: "text.primary",
      },
      panel: {
        bg: "bg.surface",
        borderColor: "border.subtle",
        borderRadius: "20px",
        borderWidth: "1px",
        boxShadow:
          "0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 30px rgba(0, 0, 0, 0.05)",
        p: { base: "4", md: "5" },
      },
      inlineBanner: {
        bg: "accent.blueSoft",
        borderColor: "border.subtle",
        borderRadius: "14px",
        borderWidth: "1px",
        color: "accent.blueHover",
        fontSize: "14px",
        fontWeight: "600",
        p: "4",
      },
    },
    textStyles: {
      pageTitle: {
        color: "text.primary",
        fontSize: { base: "30px", md: "42px" },
        fontWeight: "740",
        letterSpacing: "0",
        lineHeight: "1.04",
      },
      panelTitle: {
        color: "text.primary",
        fontSize: "16px",
        fontWeight: "780",
        letterSpacing: "0",
        lineHeight: "1.2",
      },
      subtitle: {
        color: "text.secondary",
        fontSize: "15px",
        lineHeight: "1.45",
      },
      metadata: {
        color: "text.secondary",
        fontSize: "13px",
        fontWeight: "600",
        lineHeight: "1.4",
      },
      monoId: {
        color: "text.secondary",
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "12px",
        overflowWrap: "anywhere",
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
