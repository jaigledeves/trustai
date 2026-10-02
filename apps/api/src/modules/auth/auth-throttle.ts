import { SetMetadata, type ExecutionContext } from "@nestjs/common";
import { resolveClientIp } from "../throttling/client-ip";

export const AUTH_THROTTLE_TTL_MS = 60_000;
export const DEFAULT_AUTH_THROTTLE_LIMIT = 5;
/** RFC 5321 limits an email address to 254 characters; longer values are not real emails. */
export const MAX_EMAIL_TRACKER_LENGTH = 254;
export const ACCOUNT_THROTTLE_KEY = "trustai:account-throttle";

const UNKNOWN_IP_TRACKER = "ip:unknown";

/**
 * Per-account limit for `POST /auth/login` and `POST /auth/forgot-password`.
 * Read at request time (same `Resolvable<number>` pattern as
 * `resolveUploadThrottleLimit`) so `AUTH_THROTTLE_LIMIT` stays configurable.
 * Unset, blank, non-integer or non-positive values fall back to the default:
 * `Number("")` is 0 (every request would be rejected) and `Number("abc")` is
 * NaN (the limit would silently stop applying).
 */
export function resolveAuthThrottleLimit(): number {
  const raw = process.env["AUTH_THROTTLE_LIMIT"]?.trim();
  if (!raw) return DEFAULT_AUTH_THROTTLE_LIMIT;
  const limit = Number(raw);
  return Number.isInteger(limit) && limit >= 1 ? limit : DEFAULT_AUTH_THROTTLE_LIMIT;
}

/**
 * Tracks auth attempts by the target account. Keying by email caps brute
 * force against a single account regardless of origin. Spraying one
 * password across many accounts is capped by the `global` per-IP throttler,
 * which still applies on top of this one. That throttler sees the real client
 * IP through the trusted proxy headers (see resolveClientIp) only when
 * TRUSTED_PROXY_SECRET is set and matches on both Railway and Vercel;
 * otherwise all web traffic shares the hosting egress-IP bucket.
 */
export function accountTracker(req: Record<string, unknown>): string {
  const body = req["body"] as Record<string, unknown> | undefined;
  const email = body?.["email"];
  if (typeof email === "string") {
    const normalized = email.trim().toLowerCase();
    if (normalized !== "" && normalized.length <= MAX_EMAIL_TRACKER_LENGTH) {
      return `account:${normalized}`;
    }
  }
  const ip = resolveClientIp(req);
  return ip ? `ip:${ip}` : UNKNOWN_IP_TRACKER;
}

/** Opts a handler into the `account` throttler registered by ThrottlingModule. */
export const AccountThrottle = (): MethodDecorator => SetMetadata(ACCOUNT_THROTTLE_KEY, true);

/** True when the handler being executed carries `@AccountThrottle()`. */
export function isAccountThrottled(context: ExecutionContext): boolean {
  return Reflect.getMetadata(ACCOUNT_THROTTLE_KEY, context.getHandler()) === true;
}
