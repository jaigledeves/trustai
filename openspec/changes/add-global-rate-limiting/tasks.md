# Tasks: Global Rate Limiting

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~380-450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR1 guard+wiring -> PR2 routes+e2e |
| Delivery strategy | ask-on-risk (default) |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Guard + wiring, tested, default active | PR 1 | Phases 1-3; base=main |
| 2 | Overrides, exemptions, comment fixes, env, e2e | PR 2 | Phases 4-8; base=PR 1 branch |

## Phase 1: Prerequisites

- [x] 1.1 Confirm `@nestjs/throttler` v6 `getTracker` signature + injection tokens vs design.md.
- [x] 1.2 `modules/auth/auth.module.ts`: export `JwtModule` (keep `JwtAuthGuard`).

## Phase 2: Guard unit tests (TDD)

- [x] 2.1 [RED] `modules/throttling/user-aware-throttler.guard.spec.ts`: auth `sub` tracker; IP fallback (no/invalid token); 2 subs/1 IP distinct; 2 anon/1 IP shared (mock `JwtService`).
- [x] 2.2 [GREEN] `modules/throttling/user-aware-throttler.guard.ts`: implement per design.md interface; pass 2.1.
- [x] 2.3 [REFACTOR] Align ctor/tokens with 1.1 findings; keep 2.1 green.

## Phase 3: Module wiring (TDD)

- [x] 3.1 [RED] Integration test: `APP_GUARD` present; `JwtService` injectable via `AuthModule`.
- [x] 3.2 [RED] Extend `trust-records.e2e-spec.ts` (no-override route): within limit succeeds; over `THROTTLE_LIMIT`/`THROTTLE_TTL_SECONDS` -> 429.
- [x] 3.3 [GREEN] `throttling.module.ts`: `ThrottlerModule.forRootAsync` (name `"global"`, env ttl/limit) + `APP_GUARD`; imports `AuthModule`. Pass 3.1.
- [x] 3.4 [GREEN] `app.module.ts`: import `ThrottlingModule`; confirm 3.2 in Phase 7.

## Phase 4: Upload & anchor overrides (TDD via e2e)

- [x] 4.1 [RED] Extend `assets.e2e-spec.ts`: over `UPLOAD_THROTTLE_LIMIT` -> 429, no job enqueued, no OpenAI call; limit < `THROTTLE_LIMIT`.
- [x] 4.2 [GREEN] `assets.controller.ts`: add `resolveUploadThrottleLimit()` + `@Throttle({ global: {...} })` on `upload()`.
- [x] 4.3 [RED] Extend `trust-records.e2e-spec.ts`: over `ANCHOR_THROTTLE_LIMIT` on `anchor()` returns 429.
- [x] 4.4 [GREEN] `trust-records.controller.ts`: add `resolveAnchorThrottleLimit()` + `@Throttle({ global: {...} })` on `anchor()`.

## Phase 5: Exemptions + stale comment fixes

- [x] 5.1 [RED] Extend `health.e2e-spec.ts`: calls exceeding `THROTTLE_LIMIT`, none receive 429.
- [x] 5.2 [GREEN] `health.controller.ts`: `@SkipThrottle()` on `getHealth()`.
- [x] 5.3 [RED] Extend `public-verification.e2e-spec.ts`: `S-PV-7`/`S-PV-8` pass; global guard adds no extra 429.
- [x] 5.4 [GREEN] `public-verification.controller.ts`: class-level `@SkipThrottle({ global: true })`; comment: cite ADR-012, drop "never global APP_GUARD"/RF-042 mislabel.
- [x] 5.5 [GREEN] `public-verification.module.ts`: comment: cite ADR-012.

## Phase 6: Env + docs

- [x] 6.1 `.env.example`: add `THROTTLE_TTL_SECONDS=60`, `THROTTLE_LIMIT=100`, `UPLOAD_THROTTLE_LIMIT=5`, `ANCHOR_THROTTLE_LIMIT=10`.
- [x] 6.2 Verify `ADR-012` cross-links spec/design (exists — do not recreate).

## Phase 7: E2E execution (Docker)

- [x] 7.1 Docker (Postgres/MinIO) + native anvil up; ran `pnpm --filter @trustai/api test:e2e`. Throttle scenarios all GREEN: 3.2 `S-DTR-17` (global default 429), 4.1 `S-ASSET-7` (upload 429 blocks job/OpenAI, proven via DigitalAsset row-count), 4.3 `S-DTR-18` (anchor 429), 5.1 `S-HEALTH-2` (health exempt), 5.3 `S-PV-7/8/9`. Two fixes were needed after the first live run: (a) `health.controller.ts` bare `@SkipThrottle()` → `@SkipThrottle({ global: true })` (the app throttler is named `"global"`, not `"default"`); (b) `S-DTR-17` now passes explicit `?page=1&pageSize=20` to sidestep a **pre-existing, unrelated** empty-query pagination 500 (zero diff on the DTO/repo — flagged for a separate change).
- [x] 7.2 Zero regression on `S-PV-7`/`S-PV-8` (public-verify 60/20) confirmed GREEN at runtime. Required consolidating `public-verification` onto the single global guard (per-route `@Throttle({ global: {...} })`) — the original two-`ThrottlerModule` design collided on the options DI token and silently disabled the 60/20 (ADR-012, Decision 4). Added `S-PV-9` (per-route override beats a low `THROTTLE_LIMIT`).

## Phase 8: Verification gate

- [x] 8.1 `pnpm --filter @trustai/api test` — unit suite green (guard + wiring + new `upload-throttle-limit.spec.ts`). **217 passed, 1 skipped, 0 failed** (31 test files).
- [x] 8.2 `pnpm --filter @trustai/api typecheck` — clean. **0 errors.**
- [x] 8.3 (Docker + anvil up) `pnpm --filter @trustai/api test:e2e` — all 7 spec requirements covered and GREEN. Remaining suite failures are **pre-existing chain-timing flakiness**, NOT this change: (1) `certification-flow` (`S-GOLDEN-1/2`) passed once the stale pg-boss job backlog was purged (`DELETE FROM pgboss.job ...`); (2) `public-verification` `S-PV-1/2/5/6` intermittently time out (30s) waiting on 2 on-chain confirmations from a long-running anvil — they each certify a record via a **fresh user** (1 upload each), so the per-user upload throttle cannot fire (no 429s; the failing set shifts run-to-run = flakiness). Coverage gap for Req 3 ("upload stricter than global") closed by a Docker-free unit test (`upload-throttle-limit.spec.ts`).
