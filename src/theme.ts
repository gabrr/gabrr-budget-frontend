import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  globalCss: {
    "html, body": {
      bg: "canvas",
      color: "ink",
    },
    body: {
      fontFamily: "interface",
    },
    "::selection": {
      bg: "selected",
      color: "ink",
    },
  },
  theme: {
    tokens: {
      colors: {
        ink: { value: "#101010" },
        graphite: { value: "#212626" },
        muted: { value: "#646866" },
        rule: { value: "#d8d8d2" },
        ruleSoft: { value: "#ecece8" },
        canvas: { value: "#ffffff" },
        pane: { value: "#f7f7f5" },
        selected: { value: "#f0f3f3" },
        horizon: { value: "#2f6f7e" },
        horizonDeep: { value: "#174b59" },
        horizonLight: { value: "#76a8b2" },
        evergreen: { value: "#596b5b" },
        antique: { value: "#8a642f" },
        oxblood: { value: "#8b4a46" },
        cashFixed: { value: "#313944" },
        cashVariable: { value: "#627693" },
        cashDebt: { value: "#6f2935" },
      },
      fonts: {
        interface: {
          value: '"Söhne", "Helvetica Neue", Arial, sans-serif',
        },
        editorial: {
          value: '"Iowan Old Style", Baskerville, Georgia, serif',
        },
        mono: {
          value: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
        },
      },
      radii: {
        control: { value: "10px" },
        pane: { value: "16px" },
        layer: { value: "22px" },
        layerDashboard: { value: "24px" },
      },
      durations: {
        control: { value: "160ms" },
        state: { value: "220ms" },
        layer: { value: "320ms" },
      },
      easings: {
        enter: { value: "cubic-bezier(.22, 1, .36, 1)" },
      },
      shadows: {
        layer: { value: "0 28px 90px rgb(16 16 16 / 16%)" },
      },
    },
    semanticTokens: {
      colors: {
        "bg.page": { value: "{colors.canvas}" },
        "bg.surface": { value: "{colors.canvas}" },
        "bg.surfaceElevated": { value: "{colors.canvas}" },
        "bg.control": { value: "{colors.pane}" },
        "bg.controlActive": { value: "{colors.selected}" },
        "text.primary": { value: "{colors.ink}" },
        "text.secondary": { value: "{colors.muted}" },
        "text.tertiary": { value: "{colors.muted}" },
        "text.inverse": { value: "{colors.canvas}" },
        "border.subtle": { value: "{colors.rule}" },
        "border.strong": { value: "{colors.ink}" },
        "grid.line": { value: "{colors.ruleSoft}" },
        "accent.blue": { value: "{colors.horizon}" },
        "accent.blueHover": { value: "{colors.horizonDeep}" },
        "accent.blueSoft": { value: "{colors.selected}" },
        "accent.bluePressed": { value: "{colors.horizonDeep}" },
        success: { value: "{colors.evergreen}" },
        successSoft: { value: "#f4f7f4" },
        warning: { value: "{colors.antique}" },
        warningSoft: { value: "#fbf8f2" },
        danger: { value: "{colors.oxblood}" },
        dangerSoft: { value: "#fcf6f5" },
        dangerBorder: { value: "#e8cecc" },
        "chip.bg": { value: "{colors.pane}" },
        "chip.bgHover": { value: "{colors.selected}" },
        "chip.border": { value: "{colors.rule}" },
        "chip.borderHover": { value: "{colors.ink}" },
        "chip.text": { value: "{colors.ink}" },
        "chip.filter": { value: "{colors.graphite}" },
        "chip.filterSelected": { value: "{colors.horizonDeep}" },
        "chip.disabledBg": { value: "{colors.ruleSoft}" },
        "chip.disabledText": { value: "{colors.muted}" },
      },
    },
    layerStyles: {
      page: {
        minH: "100dvh",
        bg: "canvas",
        color: "ink",
      },
      panel: {
        bg: "canvas",
        borderColor: "rule",
        borderRadius: "pane",
        borderWidth: "1px",
      },
      inlineBanner: {
        bg: "pane",
        borderColor: "rule",
        borderRadius: "control",
        borderWidth: "1px",
        color: "ink",
        fontSize: "13px",
        p: "4",
      },
    },
    textStyles: {
      pageTitle: {
        color: "ink",
        fontSize: { base: "30px", md: "36px" },
        fontWeight: "600",
        letterSpacing: "-0.04em",
        lineHeight: "1",
      },
      panelTitle: {
        color: "ink",
        fontSize: "18px",
        fontWeight: "600",
        letterSpacing: "-0.02em",
        lineHeight: "1.2",
      },
      subtitle: {
        color: "muted",
        fontSize: "14px",
        lineHeight: "1.45",
      },
      metadata: {
        color: "muted",
        fontSize: "12px",
        fontWeight: "500",
        lineHeight: "1.4",
      },
      monoId: {
        color: "muted",
        fontFamily: "mono",
        fontSize: "12px",
        overflowWrap: "anywhere",
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
