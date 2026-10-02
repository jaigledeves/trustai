/** Local web dev origin (`next dev -p 3100`). */
export const DEFAULT_CORS_ORIGINS: readonly string[] = ["http://localhost:3100"];

export interface CorsOriginsResolution {
  origins: string[];
  /** True when no usable origin was configured and the dev default applies. */
  usedFallback: boolean;
}

/**
 * Parses `CORS_ORIGINS` (comma-separated) into the allow-list passed to
 * `app.enableCors`. Only the public `/verify` page calls the API from the
 * browser, so production must list the web origin explicitly. Entries are
 * trimmed, lowercased and lose trailing slashes, matching what a browser
 * sends in the `Origin` header. A wildcard is never honored; with no usable entry the local dev
 * origin applies and `usedFallback` lets the caller warn about it.
 */
export function resolveCorsOrigins(raw: string | undefined): CorsOriginsResolution {
  const origins = (raw ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, "").toLowerCase())
    .filter((origin) => origin !== "" && origin !== "*");
  return origins.length > 0
    ? { origins, usedFallback: false }
    : { origins: [...DEFAULT_CORS_ORIGINS], usedFallback: true };
}
