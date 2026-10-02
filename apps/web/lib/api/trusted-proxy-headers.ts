/**
 * Server-only. Forwards the real client IP (first `x-forwarded-for` entry,
 * set by Vercel) plus the shared `TRUSTED_PROXY_SECRET`, so the API can rate
 * limit per client instead of per hosting egress IP. Empty when either is missing.
 */
export function trustedProxyHeaders(request: Request): Record<string, string> {
  const secret = process.env["TRUSTED_PROXY_SECRET"];
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return secret && ip ? { "x-proxy-secret": secret, "x-client-ip": ip } : {};
}
