export function formatNormalizedDate(
  value: string | Date | null | undefined,
  locale = "en-GB",
): string {
  if (!value) return "n/a";

  const date = typeof value === "string" ? parseDateOnly(value) : value;
  if (Number.isNaN(date.getTime())) return "n/a";

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function parseDateOnly(value: string): Date {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!dateOnlyMatch) {
    return new Date(value);
  }

  const [, year, month, day] = dateOnlyMatch;

  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}
