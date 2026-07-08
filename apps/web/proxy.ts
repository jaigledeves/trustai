import { NextResponse, type NextRequest } from "next/server";
import { config as appConfig } from "./lib/config";

/**
 * Guards `/dtrs/:path*` (spec: "Guarded Route Session Enforcement").
 * Checks cookie PRESENCE only — never validity. This runs pre-render at the
 * edge, before any org-scoped data would be fetched; the actual JWT is
 * still validated on every proxied API call (401s are handled client-side
 * by the proxy/client-fetch, never trusted here).
 *
 * Named `proxy` (not `middleware`) — Next 16 renamed the `middleware.ts`
 * file convention to `proxy.ts`; `middleware.ts` still works but is
 * deprecated and warns on every build.
 */
export function proxy(request: NextRequest): NextResponse {
  const hasSession = request.cookies.has(appConfig.sessionCookieName);

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dtrs/:path*"],
};
