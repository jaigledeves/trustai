/**
 * Formats a date as a human-readable string.
 * Uses Intl.DateTimeFormat — no external dependencies.
 *
 * @example
 * formatDate(new Date("2026-07-20")) // "20 de julio de 2026"
 */
export function formatDate(date: Date, locale = "es-ES"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Returns a relative time string (e.g. "hace 3 días").
 * Uses Intl.RelativeTimeFormat — no external dependencies.
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 3 * 86400_000)) // "hace 3 días"
 */
export function formatRelativeTime(date: Date, locale = "es-ES"): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / 3_600_000);
    return rtf.format(diffHours, "hour");
  }

  return rtf.format(diffDays, "day");
}
