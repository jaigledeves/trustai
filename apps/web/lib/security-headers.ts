/**
 * Security headers for every web route, consumed by `next.config.ts`
 * `headers()`. Pure so it can be unit tested without booting Next.
 *
 * What the browser loads from other origins (surveyed): nothing except the
 * NestJS API, which the public `/verify` page calls directly through
 * `NEXT_PUBLIC_API_BASE_URL` (`lib/api/public-verify-client.ts`). Fonts come
 * from `next/font/google`, which self-hosts them at build time; all other API
 * calls go through same-origin route handlers (`/api/...`); no page embeds an
 * iframe, so `frame-src` is `'none'`.
 *
 * Known limitation: without nonces, Next.js needs `script-src 'unsafe-inline'`
 * for its inline bootstrap and hydration scripts (and the theme init script
 * in `app/layout.tsx`), so the CSP does not stop injected inline scripts. A
 * nonce-based CSP (set per request from the proxy) is a later step. `next dev`
 * also needs `'unsafe-eval'`, which is added only in development.
 */

export interface SecurityHeadersOptions {
  /** `NEXT_PUBLIC_API_BASE_URL`, read at build time. */
  publicApiBaseUrl: string;
  isDevelopment: boolean;
}

export interface SecurityHeader {
  key: string;
  value: string;
}

const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "serial=()",
  "bluetooth=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
].join(", ");

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

function buildContentSecurityPolicy(options: SecurityHeadersOptions): string {
  const apiOrigin = originOf(options.publicApiBaseUrl);
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (options.isDevelopment) scriptSrc.push("'unsafe-eval'");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": apiOrigin ? ["'self'", apiOrigin] : ["'self'"],
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function buildSecurityHeaders(options: SecurityHeadersOptions): SecurityHeader[] {
  return [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  ];
}
