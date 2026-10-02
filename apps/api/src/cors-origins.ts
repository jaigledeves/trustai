/** Local web dev origin (`next dev -p 3100`). */
export const DEFAULT_CORS_ORIGINS: readonly string[] = ["http://localhost:3100"];

/**
 * Parses `CORS_ORIGINS` (comma-separated) into the allow-list passed to
 * `app.enableCors`. Only the public `/verify` page calls the API from the
 * browser, so production must list the web origin explicitly. A wildcard is
 * never honored: an unset or wildcard-only value falls back to local dev.
 */
export function resolveCorsOrigins(raw: string | undefined): string[] {
  const origins = (raw ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "" && origin !== "*");
  return origins.length > 0 ? origins : [...DEFAULT_CORS_ORIGINS];
}
