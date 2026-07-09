# @trustai/web

Next.js 16 (App Router) web UI for TrustAI — auth, certify wizard, DTR history, and the
no-auth public verify page. See `design.md` (`sdd/web-frontend`) for the full architecture.

## Dev runtime

```bash
pnpm --filter @trustai/web run dev
```

Runs on port `3100` (not `3000` — `apps/api` conventionally owns `3000`, so both dev servers can
run side by side; required by `e2e/certify-golden-path.spec.ts` and `e2e/public-verify.spec.ts`).

## Environment variables

Copy `.env.example` to `.env` and adjust as needed.

| Variable | Scope | Default | Purpose |
|---|---|---|---|
| `API_BASE_URL` | Server-only | `http://localhost:3000` | Target for `lib/api/server-client.ts` and the Bearer-injecting proxy (`app/api/backend/[...path]/route.ts`). Never exposed to the browser. |
| `NEXT_PUBLIC_API_BASE_URL` | Public | `http://localhost:3000` | Direct client-side calls for the no-auth `/verify/[id]` page only (public verify calls the API directly, no auth — see design.md's Data Flow). |
| `SESSION_COOKIE_NAME` | Server-only | `trustai_session` | httpOnly session cookie name, set by `app/api/auth/login/route.ts`. |
| `NEXT_PUBLIC_PUBLIC_VERIFICATION_ENABLED` | Public | `false` | Mirrors `apps/api`'s `PUBLIC_VERIFICATION_ENABLED` flag — hides the `/verify` nav entry and dark-renders "no disponible" instead of a failed fetch when the backend module isn't mounted. |
| `NEXT_PUBLIC_CHAIN_EXPLORER_BASE_URL` | Public | `https://sepolia.basescan.org` | Builds `anchor.txHash` explorer links in the wizard/detail view and the public verify card. Change for a different chain/network. |

`NEXT_PUBLIC_*` vars are inlined at build time and safe for the browser; unprefixed vars are
server-only. See `lib/config.ts` for the centralized reader.

## Design decisions

### Cookie `maxAge`

The session cookie's `maxAge` (`lib/session.ts`'s `buildSessionCookieOptions`) is hardcoded to
`SEVEN_DAYS_SECONDS` (`60 * 60 * 24 * 7`, defined in `lib/config.ts`), matching `apps/api`'s
`JWT_EXPIRES_IN=7d` default.

**No shared config source exists between `apps/web` and `apps/api` yet.** If `JWT_EXPIRES_IN`
changes on the API, `SEVEN_DAYS_SECONDS` in `apps/web/lib/config.ts` must be updated manually to
match — nothing enforces this invariant automatically. A cookie that outlives its JWT means the
browser keeps sending an expired token (every proxied call then 401s, which is a safe failure
mode, just not a great UX); a cookie that expires before the JWT logs the user out early.

### `pageSize` cap

`GET /trust-records` (`apps/api`'s `TrustRecordsController.list`) caps `pageSize` at `100`
server-side via `Math.min(pageSize, MAX_PAGE_SIZE)`, regardless of what the client requests
(default `20` if omitted). This is enforced only in the backend controller — `apps/web`'s history
list does not send an unbounded `pageSize` and does not need its own client-side cap, since the
API is the source of truth and always returns the actually-applied `pageSize` in its response.

## Testing

```bash
pnpm --filter @trustai/web run test       # unit/integration (Vitest + Testing Library + msw)
pnpm --filter @trustai/web run test:e2e   # Playwright, real dev server on :3100
pnpm --filter @trustai/web run typecheck
pnpm --filter @trustai/web run lint
```

E2E specs (`e2e/*.spec.ts`) exercise real flows against a running dev server (`playwright.config.ts`
starts `pnpm dev` automatically). Specs that also need a live `apps/api` (`certify-golden-path.spec.ts`,
`public-verify.spec.ts`) use `e2e/utils/api-availability.ts` to skip gracefully — not fail — when the
backend isn't reachable at `E2E_API_BASE_URL`/`http://localhost:3000`. `guarded-route.spec.ts` and
`smoke.spec.ts` need only the frontend dev server (no backend call in the code path under test).
