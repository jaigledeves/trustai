/**
 * Centralized env config reader for `apps/web`.
 *
 * `API_BASE_URL` is server-only (route handlers / Server Components proxy
 * to the NestJS API with a Bearer token attached — see `lib/api/server-client.ts`
 * and `app/api/backend/[...path]/route.ts`). `NEXT_PUBLIC_*` vars are
 * inlined at build time and safe for the browser (public verify calls the
 * API directly, no auth — see design.md's Data Flow).
 */

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

export const config = {
  /** Server-only target for server-client + the Bearer-injecting proxy. */
  apiBaseUrl: (): string =>
    process.env["API_BASE_URL"] ?? "http://localhost:3000",

  /** Public — direct client calls for the no-auth public verify page. */
  publicApiBaseUrl:
    process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3000",

  /**
   * httpOnly session cookie name (server-only). Centralized here — see
   * `lib/session.ts` for the cookie's flags/maxAge.
   */
  sessionCookieName: process.env["SESSION_COOKIE_NAME"] ?? "trustai_session",

  /**
   * Cookie `maxAge` in seconds. Hardcoded to match `apps/api/.env.example`'s
   * `JWT_EXPIRES_IN=7d` default (Task Decision, sdd/web-frontend/tasks).
   * No shared config source exists between the two apps yet — if
   * `JWT_EXPIRES_IN` changes on the API, this constant must be updated
   * manually.
   */
  sessionMaxAgeSeconds: SEVEN_DAYS_SECONDS,

  /** Mirrors the backend's `PUBLIC_VERIFICATION_ENABLED` flag. */
  publicVerificationEnabled:
    process.env["NEXT_PUBLIC_PUBLIC_VERIFICATION_ENABLED"] === "true",

  /** Builds `anchor.txHash` explorer links (public-verify already gets its own `explorerUrl` from the API). */
  chainExplorerBaseUrl:
    process.env["NEXT_PUBLIC_CHAIN_EXPLORER_BASE_URL"] ??
    "https://sepolia.basescan.org",
};
