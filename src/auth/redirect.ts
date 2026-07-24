const DEFAULT_AUTH_DESTINATION = "/dashboard";

export function safeAuthDestination(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return DEFAULT_AUTH_DESTINATION;
  }

  try {
    const destination = new URL(value, "https://gabrr.local");
    if (
      destination.origin !== "https://gabrr.local" ||
      destination.pathname === "/auth/confirm"
    ) {
      return DEFAULT_AUTH_DESTINATION;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_AUTH_DESTINATION;
  }
}
