export const AUTH_THROTTLE_TTL_MS = 60_000;
export const DEFAULT_AUTH_THROTTLE_LIMIT = 5;

/**
 * Per-account limit for `POST /auth/login` and `POST /auth/forgot-password`.
 * Read at request time (same `Resolvable<number>` pattern as
 * `resolveUploadThrottleLimit`) so `AUTH_THROTTLE_LIMIT` stays configurable.
 */
export function resolveAuthThrottleLimit(): number {
  return Number(process.env["AUTH_THROTTLE_LIMIT"] ?? DEFAULT_AUTH_THROTTLE_LIMIT);
}

/**
 * Tracks auth attempts by the target account instead of the client IP.
 * The web calls these routes from its Next server, so every request reaches
 * the API from the hosting provider's egress IP: an IP key would make all
 * users share one bucket. Keying by email caps brute force against a single
 * account regardless of origin. It does not stop spraying one password
 * across many accounts; that needs the real client IP (see docs/14-Roadmap.md).
 */
export function accountTracker(req: Record<string, unknown>): string {
  const body = req["body"] as Record<string, unknown> | undefined;
  const email = body?.["email"];
  if (typeof email === "string" && email.trim() !== "") {
    return `account:${email.trim().toLowerCase()}`;
  }
  return `ip:${req["ip"] as string}`;
}
