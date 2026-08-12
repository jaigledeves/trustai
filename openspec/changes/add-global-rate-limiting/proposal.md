# Proposal: Global Rate Limiting with Per-Route Overrides for Cost-Sensitive Endpoints

## Package / Domain

`api` — apps/api only (NestJS, hexagonal); no other packages touched.

## Intent

Only `public-verification` is throttled (60/min GET, 20/min POST), via a module-local guard, not global. `POST /assets` triggers `analyze-document` → paid OpenAI adapter (~€0.008/doc) — **no throttle**. Any authenticated user can spam uploads and burn credits; repo is going public (test creds in README, TFM 1.f), possibly on a funded key. Secondary vectors: `/auth/*`, `anchor` (gas).

## Current-State Gap

"Never a global `APP_GUARD`" is an undocumented comment, not a spec'd invariant — cites a non-existent `design.md`, mislabels RF-042 (unrelated hash-safety rule). Valid originally (IP-keyed guard, `public-verify` was the only anonymous route); no longer holds now the cost path is authenticated and `getTracker` (v6) lets us key by user.

## Scope

**In**: global `ThrottlerModule` + `APP_GUARD` (env `THROTTLE_TTL_SECONDS`/`THROTTLE_LIMIT`); guard keying auth by JWT `sub`, anonymous by IP; low override on `POST /assets` (`UPLOAD_THROTTLE_LIMIT`, ~5/min); moderate override on `anchor`; `@SkipThrottle()` on health; ADR-012; `.env.example` updates.

**Out**: `public-verification` 60/20 unchanged (no OpenAI calls); no bespoke `/auth/*` limits beyond default; no Redis-backed storage (single-instance MVP); no adapter changes.

## Capabilities

**New**: `api-rate-limiting` — global throttling, auth-aware tracking, per-route clamps.
**Modified**: None (no existing spec covers this).

## Approach

Custom `UserAwareThrottlerGuard` overrides `getTracker` (user id if authenticated, else IP), registered as global `APP_GUARD` alongside `ThrottlerModule.forRoot`. Fix stale `public-verification` comments to cite ADR-012 instead of the fictitious `design.md`/RF-042 — no behavior change there. Design phase authors ADR-012.

## Affected Areas

- `app.module.ts` — global `ThrottlerModule` + `APP_GUARD`
- `assets.controller.ts` — low upload override (env-resolvable, same pattern as `public-verification.controller.ts`)
- `trust-records` controller — moderate `anchor` override
- `public-verification/*.ts` — comment fix only
- health controller — `@SkipThrottle()`
- new guard file (location TBD) — user-id keying
- `.env.example`, `docs/adr/ADR-012-*.md`, `apps/api/test/*.e2e-spec.ts` — env vars, ADR, throttle specs

## Risks

- False-throttle shared-IP traffic — Low — resolved by user-id tracker
- Upload limit too tight for legit bulk use — Medium — env-configurable
- Docker-dependent e2e tests flaky — Medium — unit guard tests as primary safety net

## Rollback Plan

Remove the `APP_GUARD` provider + `ThrottlerModule.forRoot`, drop new env vars, remove the `assets`/`anchor` overrides and health `@SkipThrottle()`. `public-verification`'s guard is independent — unaffected either way. ADR-012 stays as historical record even if reverted.

## Dependencies

`@nestjs/throttler` v6 (installed) — confirm `getTracker` API in design.

## Success Criteria

- [ ] `POST /assets` throttled per user id at a low, env-configurable rate
- [ ] `anchor` has a moderate override; global default applies elsewhere
- [ ] `public-verification` 60/20 unchanged; health exempt
- [ ] ADR-012 authored, superseding the prior rationale
- [ ] Throttle tests written before implementation (strict_tdd) and passing
