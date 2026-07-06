export function parseLocalizedNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const numeric = trimmed.replace(/[^\d,.-]/g, "");
  const lastComma = numeric.lastIndexOf(",");
  const lastDot = numeric.lastIndexOf(".");
  const decimalSeparator =
    lastComma > -1 && lastDot > -1
      ? lastComma > lastDot
        ? ","
        : "."
      : lastComma > -1
        ? ","
        : ".";

  const normalized =
    decimalSeparator === ","
      ? numeric.replace(/\./g, "").replace(",", ".")
      : numeric.replace(/,/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function currencyInputToApiDecimal(value: string | number | null | undefined): string {
  const parsed = parseLocalizedNumber(value);
  return (parsed ?? 0).toFixed(2);
}

export function percentToMultiplier(value: string | number | null | undefined): string {
  const parsed = parseLocalizedNumber(value);
  const percent = parsed ?? 0;
  return (1 + percent / 100).toFixed(4);
}

export function multiplierToPercent(value: string | number | null | undefined): string {
  const parsed = parseLocalizedNumber(value);
  if (parsed === null) return "";

  return trimTrailingZeros(((parsed - 1) * 100).toFixed(4));
}

export function formatCompactCurrencyValue(
  value: string | number | null | undefined,
): string {
  const parsed = parseLocalizedNumber(value);
  if (parsed === null) return "n/a";

  const sign = parsed < 0 ? "-" : "";
  const absoluteValue = Math.abs(parsed);

  if (absoluteValue < 1000) {
    return `${sign}${formatDecimalValue(absoluteValue, 2, "pt-BR")}`;
  }

  const compactValue = absoluteValue / 1000;

  return `${sign}${formatDecimalValue(compactValue, 1, "en-US")}K`;
}

export function trimTrailingZeros(value: string): string {
  return value.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function formatDecimalValue(
  value: number,
  maximumFractionDigits: number,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}
