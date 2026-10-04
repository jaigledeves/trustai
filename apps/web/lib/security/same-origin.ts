import { NextResponse } from "next/server";
import { config } from "../config";

/**
 * CSRF guard for the BFF's cookie-authenticated, state-changing routes
 * (login, logout, and the backend proxy's write methods).
 *
 * The session cookie is `SameSite=Lax`, which does not stop a cross-site
 * top-level `<form method="post">` from reaching login (login CSRF: a
 * `text/plain` form whose body is valid JSON would log the victim into the
 * attacker's account). Browsers always send `Origin` on a POST/PATCH/PUT/
 * DELETE `fetch`, so the app's own client code passes this check unchanged.
 */

const FORBIDDEN_MESSAGE = "Cross-origin request rejected";
const UNSUPPORTED_CONTENT_TYPE_MESSAGE = "Content-Type must be application/json";

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Origins this app is served from: the configured public origin
 * (`NEXT_PUBLIC_APP_BASE_URL`, which survives a reverse proxy rewriting the
 * request host) and the request's own origin (local dev, preview URLs).
 */
function allowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();
  const requestOrigin = originOf(request.url);
  if (requestOrigin) origins.add(requestOrigin);
  const appOrigin = originOf(config.appBaseUrl);
  if (appOrigin) origins.add(appOrigin);
  return origins;
}

/**
 * True when the request provably comes from this app: an `Origin` header
 * equal to one of the app's origins or, only when `Origin` is absent,
 * `Sec-Fetch-Site: same-origin`. Anything else (including the opaque
 * `"null"` origin, or neither header) is rejected.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin !== null) {
    return allowedOrigins(request).has(origin);
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

/** True for `application/json`, with or without parameters such as charset. */
export function hasJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type");
  if (!contentType) return false;
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

function forbidden(message: string): NextResponse {
  return NextResponse.json({ status: 403, message }, { status: 403 });
}

/** Returns a 403 response for a cross-origin request, or `null` to proceed. */
export function rejectCrossOrigin(request: Request): NextResponse | null {
  return isSameOriginRequest(request) ? null : forbidden(FORBIDDEN_MESSAGE);
}

/**
 * Login's guard: same-origin AND a JSON body. Requiring
 * `application/json` also forces a cross-site sender into a CORS
 * preflight, which this app never grants.
 */
export function rejectCrossOriginJson(request: Request): NextResponse | null {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  return hasJsonContentType(request) ? null : forbidden(UNSUPPORTED_CONTENT_TYPE_MESSAGE);
}
