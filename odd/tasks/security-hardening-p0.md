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
- A5: per-route throttle on login, register, forgot-password, reset-password.

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
- [ ] A4 - Restricted CORS (route: inline)
- [ ] A5 - Auth route throttles (route: TBD)
- [ ] A3 - Security headers API + web (route: TBD)
- [ ] A2 - Upload size limit + magic bytes (route: TBD)

## Acceptance criteria

- API refuses to start without `JWT_SECRET`.
- CORS only allows configured origins.
- Responses carry the expected security headers.
- Oversized uploads and non-PDF bytes declared as PDF are rejected.
- Auth endpoints return 429 above their per-route limit.

## Checks

- `pnpm --filter @trustai/api test`
- `pnpm --filter @trustai/api typecheck`
- `pnpm --filter @trustai/api test:e2e` (when the task touches HTTP behavior)

## Progress

| Task | Commit | Review tier | Notes |
|---|---|---|---|
| A1 | d2bdd34 | pending | RED observed (module missing), GREEN: 33 files / 225 tests, typecheck clean. e2e not run (needs Docker). |

## Next step

A4.
