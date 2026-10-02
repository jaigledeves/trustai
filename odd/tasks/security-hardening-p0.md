# Feature: security-hardening-p0

**Locator:** `odd/tasks/security-hardening-p0.md` (Engram mirror: `odd/security-hardening-p0/tasks`)
**Branch:** `feat/security-hardening-p0`
**Source:** `docs/14-Roadmap.md`, phase A (P0 security).

## Objective

Close the five low-cost, high-risk security gaps found by the external
security review before the public repository is used as a portfolio piece.

## Problem and why

The repository is public. Insecure defaults (a known JWT secret fallback,
open CORS, no security headers, unbounded uploads trusting the client MIME
type, and auth endpoints limited only by the global throttle) are visible to
anyone reading the code.

## Scope

- A1: no default `JWT_SECRET`; fail fast at startup when missing.
- A2: upload size limit and PDF magic-byte check.
- A3: security headers (`helmet` in the API; CSP and related headers in Next).
- A4: CORS restricted to the web origin.
- A5: per-account throttle on login and forgot-password, on top of the global per-IP limit (register and reset-password keep the global limit; see checklist).

Out of scope: phases B to D, demo password rotation.

## Constraints

- Production must not break on deploy: every new required env var is listed
  in `docs/12-Deployment.md` and reported to the user before merge.
- Existing tests keep passing; new behavior ships with tests.

## Delivery

- Forecast: about 300 to 450 authored changed lines.
- Strategy: `ask-on-risk` (single PR unless the running count exceeds about 400 lines).

## Checklist

- [x] A1 - Required `JWT_SECRET` (route: inline; 1 helper + 2 call sites, no research needed)
- [x] A4 - Restricted CORS (route: inline; 1 helper + main.ts)
- [x] A5 - Per-account auth throttles on login and forgot-password (route: inline; user chose per-account keying on 2026-10-02 because the API only sees the Vercel egress IP; reset-password carries no email and per-email register limits are useless, so both keep the global limit; after a CRITICAL review finding the user chose real client IP forwarding, implemented in 85e5a1a)
- [x] A3 - Security headers API + web (route: delegated (2+ non-trivial files across api and web))
- [x] A2 - Upload size limit + magic bytes (route: delegated (2+ non-trivial files))

## Acceptance criteria

- API refuses to start without `JWT_SECRET`.
- CORS only allows configured origins.
- Responses carry the expected security headers.
- Oversized uploads and non-PDF bytes declared as PDF are rejected.
- Login and forgot-password return 429 above the per-account limit (unit-proven via throttler configuration; e2e proof pending, Docker unavailable).

## Checks

- `pnpm --filter @trustai/api test`
- `pnpm --filter @trustai/api typecheck`
- `pnpm --filter @trustai/api test:e2e` (when the task touches HTTP behavior)

## Progress

| Task | Commit | Review tier | Notes |
|---|---|---|---|
| A1 | d2bdd34, 956313d | high, granted, approved (4 lenses) | RED observed (module missing), GREEN: 33 files / 225 tests, typecheck clean. e2e not run (needs Docker). Follow-up 956313d applies review findings (trimmed placeholder, key-aware stub). Deferred: minimum secret length (unknown length of the Railway secret). |
| A4 | c971f21, ccb28cb, 7b7333e, (lowercase) | high, granted, approved for c971f21 and ccb28cb (4 lenses each) | RED observed (module missing), GREEN: 34 files / 230 tests, typecheck clean. Requires CORS_ORIGINS on Railway. Follow-up applies review findings (trailing-slash normalization, startup warning on fallback). 7b7333e reviewed in the A5 slice and in the full-branch review (approved). Lowercase normalization added after the full-branch review finding. |
| A5 | 52734b0, cfacf8f, 2b18217, 85e5a1a, (docs follow-up) | high, granted: 52734b0 approved; slice 52734b0..2b18217 required one correction (shared egress-IP bucket, CRITICAL), user chose real client IP forwarding, corrected in 85e5a1a (90-line budget) and approved after recovery | RED observed (module missing), GREEN: 35 files / 239 tests, typecheck clean. e2e not run (Docker down); vitest.e2e.config raises AUTH_THROTTLE_LIMIT so existing suites are not throttled. Review of 52734b0 approved with warnings; follow-up adds a separate `account` throttler so the global per-IP limit still applies, validates AUTH_THROTTLE_LIMIT, and bounds tracker keys. Accepted trade-off: targeted lockout of one account (5/min) is inherent to per-account keying. 85e5a1a: web forwards x-client-ip + x-proxy-secret (TRUSTED_PROXY_SECRET), API trusts it only on secret match. Follow-up: stale docs fixed, startup warning when the secret is missing, web unit tests for trustedProxyHeaders (characterization, no RED: function already existed). API 36 files / 261 tests, web 65 files, typecheck clean. Pending: e2e proof of 429 (Docker down); Vercel x-forwarded-for overwrite assumed from Vercel docs. |
| A3 | (pending commit) | pending | RED observed in both apps (module missing). GREEN: API 37 files / 264 tests (+1 skipped), web 66 files / 339 tests; typecheck clean in both, web lint 0 errors, `next build` OK with the CSP in routes-manifest. API: `helmet` 8 with one CSP for JSON and Swagger UI (`script-src 'self'`, inline styles, `data:` images, no `upgrade-insecure-requests`, `frame-ancestors 'none'`). Web survey: the only cross-origin browser call is `/verify` to `NEXT_PUBLIC_API_BASE_URL`; fonts are self-hosted by `next/font`; no iframes, analytics or remote images; `/slides` is a self-contained static HTML with an inline script (covered by `'unsafe-inline'`). `frame-src 'none'`. Limitation: `script-src 'unsafe-inline'` until a nonce-based CSP. |
| A2 | (pending commit) | pending | RED observed (upload-limits module missing; fake PDF accepted by the controller). GREEN: API 40 files / 288 tests (+1 skipped), typecheck clean. `uploads/upload-limits.ts`: `MAX_UPLOAD_BYTES` (default 10 MB, read once at module load), multer `limits: { fileSize: max + 1, files: 1 }` (busboy rejects on reaching `fileSize`), `isPdf` (`%PDF-` at offset 0). `POST /assets` keeps the MIME check, adds the signature check (400) and persists `application/pdf` instead of the client value; `POST /public/verify/:id` gets the size limit only. 413 proven in unit tests by running both routes' real FileInterceptor against an oversized multipart stream (`LIMIT_FILE_SIZE` -> `PayloadTooLargeException`, checked in `@nestjs/platform-express` multer.utils). e2e cases added (S-ASSET-2b/2c, S-PV-4b), unverified (Docker down). Vercel caps function request bodies at about 4.5 MB, so certification through the web proxy is capped there; public verification calls the API directly. Pending: web 413 copy (needs `apps/web/dictionaries/es`, outside the delegated surface). |

## Next step

Open PR after deploy prerequisites. Before merge: set JWT_SECRET (already), CORS_ORIGINS and TRUSTED_PROXY_SECRET on Railway, and TRUSTED_PROXY_SECRET on Vercel; NEXT_PUBLIC_API_BASE_URL must be set at build time on Vercel (web CSP).
