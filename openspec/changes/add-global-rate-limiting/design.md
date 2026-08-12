# Design: Global Rate Limiting with Per-Route Overrides

## Technical Approach

Add a `ThrottlingModule` registering a **named** global throttler
(`"global"`, env `THROTTLE_TTL_SECONDS`/`THROTTLE_LIMIT`) via
`ThrottlerModule.forRootAsync` + `APP_GUARD`, using a custom
`UserAwareThrottlerGuard`. **Every** route with its own limit declares it
as a per-route `@Throttle({ global: {...} })` override on that single
throttler: `POST /assets` (strict), `POST /trust-records/:id/anchor`
(moderate), and `public-verification`'s `GET`/`POST` (its long-standing
60/20). `GET /health` gets `@SkipThrottle({ global: true })`.
`public-verification` no longer registers its own `ThrottlerModule` —
consolidating onto one guard avoids a `@nestjs/throttler` options-token
DI collision that silently disabled the local 60/20 (see Decision 4).
Satisfies all 7 requirements in `specs/api-rate-limiting/spec.md`.

## Architecture Decisions

**ADR-012** (new) covers the core tradeoff below.

| # | Decision | Alternatives rejected | Rationale |
|---|----------|------------------------|-----------|
| 1 | Global `APP_GUARD` + user-id-aware `getTracker`, superseding the undocumented "never global" comment | (a) status quo — leaves `POST /assets` unthrottled against the paid OpenAI adapter; (b) global guard, IP-only tracker — reintroduces the NAT false-throttle risk the original comment warned about, now app-wide | The cost-sensitive `analyze-document` path didn't exist when the comment was written; v6's `getTracker` enables per-user keying, neutralizing the NAT concern |
| 2 | `getTracker` verifies the Bearer JWT itself (via injected `JwtService`) instead of reading `req.user` | Reorder guards so auth runs first — requires making `JwtAuthGuard` global, breaking `public-verification`/`health`'s no-auth requirement | **NestJS runs global guards before controller-level guards**, so `req.user` isn't populated yet. Self-verifying is lower-risk — read-only; an invalid token falls back to IP and is still 401'd later by `JwtAuthGuard` |
| 3 | New guard lives in `modules/throttling/` (its own Nest module) | `ports/`/`application/` — leaks framework/adapter code into hexagonal core | Mirrors convention: framework guards live beside their module (`modules/auth/jwt-auth.guard.ts`), never in ports or use-cases |
| 4 | `public-verification` folded onto the single global guard via per-route `@Throttle({ global: { 60/20 } })`; its own `ThrottlerModule` removed | (a) Keep its module-local `ThrottlerModule` + `@SkipThrottle({ global: true })` — two `ThrottlerModule`s collide on the options-token, so the local guard resolved the `"global"` options and the skip silently disabled its 60/20 (caught by e2e S-PV-7/8); (b) rely on global 100 > local 60/20 — implicit, breaks if `THROTTLE_LIMIT` drops below 60 | One guard, one throttler; the per-route override always wins over the global default, so 60/20 can't be loosened or tightened by it. Anonymous → tracker falls back to IP, same keying as before |

## getTracker Resolution (per request)

```
Anonymous route (e.g. GET /public/verify/:id, @Throttle({global:{60}})):
  request ──▶ [global guard: no JWT ⇒ getTracker ⇒ `ip:<ip>`,
               per-route override 60/20 applied on the "global" throttler]
              ──▶ handler (429 on the 61st GET / 21st POST per IP)

Authenticated route (e.g. POST /assets):
  request ──▶ [global guard: getTracker reads Authorization header,
               JwtService.verifyAsync(token) ⇒ `user:<sub>` | `ip:<ip>`]
              ──▶ (if within limit) [JwtAuthGuard: populates req.user, 401s bad tokens]
              ──▶ handler (UploadAssetUseCase — never reached on 429)

Health (GET /health, @SkipThrottle({global:true})): global guard skips ⇒ never throttled
```

## File Changes

| File | Action | Description |
|------|--------|--------------|
| `modules/throttling/throttling.module.ts` | Create | `ThrottlerModule.forRootAsync` (name `"global"`) + `APP_GUARD` provider; imports `AuthModule` for `JwtService` |
| `modules/throttling/user-aware-throttler.guard.ts` | Create | `UserAwareThrottlerGuard extends ThrottlerGuard`, overrides `getTracker` |
| `modules/throttling/user-aware-throttler.guard.spec.ts` | Create | Unit tests (TDD) — authenticated sub, IP fallback, invalid token |
| `app.module.ts` | Modify | Import `ThrottlingModule` |
| `modules/auth/auth.module.ts` | Modify | Add `JwtModule` to `exports` (currently only `JwtAuthGuard`) |
| `modules/assets/assets.controller.ts` | Modify | `@Throttle({ global: { limit: resolveUploadThrottleLimit, ttl: 60_000 } })` on `upload()` |
| `modules/trust-records/trust-records.controller.ts` | Modify | Same pattern, `ANCHOR_THROTTLE_LIMIT`, on `anchor()` |
| `modules/health/health.controller.ts` | Modify | `@SkipThrottle({ global: true })` on `getHealth()` (targets the named `"global"` throttler — a bare `@SkipThrottle()` skips only `"default"` and would leave health throttled) |
| `modules/public-verification/public-verification.controller.ts` | Modify | Per-route `@Throttle({ global: {...} })` for GET (60) and POST (20); removed `@UseGuards(ThrottlerGuard)` + `@SkipThrottle`; fix stale comment (cites ADR-012, drops "never global APP_GUARD"/mislabeled RF-042) |
| `modules/public-verification/public-verification.module.ts` | Modify | Remove own `ThrottlerModule.forRoot` (folded onto the global guard); fix stale comment (cites ADR-012) |
| `test/public-verification.e2e-spec.ts` | Modify | Add S-PV-9 (per-route override beats a low global `THROTTLE_LIMIT`); S-PV-7/8 (60/20) unchanged |
| `.env.example` | Modify | Add `THROTTLE_TTL_SECONDS=60`, `THROTTLE_LIMIT=100`, `UPLOAD_THROTTLE_LIMIT=5`, `ANCHOR_THROTTLE_LIMIT=10` |
| `docs/adr/ADR-012-*.md` | Create | This decision |

## Interfaces / Contracts

```typescript
@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super(options, storage, reflector);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const auth = (req.headers as Record<string, string>)?.["authorization"];
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
        return `user:${payload.sub}`;
      } catch {
        // Invalid/expired — fall through; JwtAuthGuard (per-route) 401s it later.
      }
    }
    return `ip:${(req as { ip: string }).ip}`;
  }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | `getTracker`: authenticated `sub`, IP fallback (no/invalid token), two `sub`s on one IP don't share a bucket | Mock `JwtService`; primary safety net per proposal risk (Docker e2e flakiness) |
| Integration | `ThrottlingModule` wiring: `APP_GUARD` present, `JwtModule` exported/injectable | `Test.createTestingModule` |
| E2E | 429 on all 7 requirement scenarios; `public-verification` 60/20 unchanged; upload 429 blocks job enqueue; health never throttled | Extend existing `*.e2e-spec.ts` (assets, trust-records, health, public-verification) |

## Migration / Rollout

No data migration. New env vars ship with defaults, so global throttling activates on deploy — intended per "Global Default Throttle Coverage". Rollback: remove the `APP_GUARD` provider/`ThrottlingModule` import and the two `@Throttle` overrides; `public-verification` is unaffected either way.

## Open Questions

None blocking. Residual risk (for verify): single-instance in-memory `ThrottlerStorage` resets on redeploy and doesn't share state across scaled instances — acceptable for this pilot (ADR-012); Redis-backed storage is an explicit future item, out of scope here.
