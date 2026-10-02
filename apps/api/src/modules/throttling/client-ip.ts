import { timingSafeEqual } from "node:crypto";

export const PROXY_SECRET_HEADER = "x-proxy-secret";
export const CLIENT_IP_HEADER = "x-client-ip";
/** Longest textual IP: an IPv6 address with an embedded IPv4 suffix. */
const MAX_IP_LENGTH = 45;

/**
 * Client IP for rate limiting. The web reaches the API from its hosting
 * egress IP, so its server forwards the real client IP in `x-client-ip`;
 * that value is trusted ONLY when `x-proxy-secret` matches
 * `TRUSTED_PROXY_SECRET`. Array-valued headers are treated as untrusted.
 */
export function resolveClientIp(req: Record<string, unknown>): string | undefined {
  const headers = (req["headers"] ?? {}) as Record<string, unknown>;
  const secret = process.env["TRUSTED_PROXY_SECRET"];
  const presented = headers[PROXY_SECRET_HEADER];
  const forwarded = headers[CLIENT_IP_HEADER];
  if (secret && typeof presented === "string" && typeof forwarded === "string") {
    const ip = forwarded.trim();
    const a = Buffer.from(presented);
    const b = Buffer.from(secret);
    if (ip !== "" && ip.length <= MAX_IP_LENGTH && a.length === b.length && timingSafeEqual(a, b)) {
      return ip;
    }
  }
  const ip = req["ip"];
  return typeof ip === "string" && ip !== "" ? ip : undefined;
}
