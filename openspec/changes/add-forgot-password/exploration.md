## Exploration: add-forgot-password

### Current State

**`apps/api` — auth module (hexagonal, ports & adapters)**

- `AuthController` (`apps/api/src/modules/auth/auth.controller.ts`) exposes `POST /auth/register`, `GET /auth/verify-email?token=`, `POST /auth/login`, `GET /auth/me` (JWT-guarded). No forgot/reset endpoints.
- `AuthModule` wires one controller to three use cases (`RegisterUseCase`, `VerifyEmailUseCase`, `LoginUseCase`) and three ports: `USER_REPOSITORY_PORT` → `PrismaUserRepository`, `PASSWORD_HASHER_PORT` → `Argon2HasherAdapter`, `NOTIFICATION_PORT` → `StubNotificationAdapter`.
- Use-case pattern: plain `@Injectable()` class, constructor-injects ports via `@Inject(TOKEN)`, one public `execute(...)` method, throws Nest HTTP exceptions directly (`BadRequestException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException`) — no separate exception-mapping layer.
- **Token mechanism (verify-email) — the pattern to mirror**:
  - Raw token = `uuidv4()`. Only the SHA-256 hash (`createHash("sha256").update(rawToken).digest("hex")`) is ever persisted; the raw token is handed only to `NotificationPort`.
  - Storage is **two columns directly on `User`**, not a separate table: `emailVerificationToken String?` (hash) + `emailVerificationExpiresAt DateTime?`. TTL = 24h, computed in the use case (`VERIFICATION_TOKEN_TTL_MS`), not the DB.
  - Validation logic lives on the **domain entity**: `User.hasValidVerificationToken(hash)` checks hash match AND `expiresAt > now()`. The use case calls `userRepository.findByVerificationToken(hash)` then `user.hasValidVerificationToken(hash)`.
  - Consumption: `markEmailVerified(userId)` nulls out both token columns after success — single-use by construction.
  - Repository method `findByVerificationToken(tokenHash)` does an **unscoped** `findFirst` (no organizationId filter) — this is a pre-auth lookup, consistent with `findByEmail`.
- **`NotificationPort`**: `{ sendVerificationEmail(email, rawToken): Promise<void> }` — single method, verification-email-specific naming (not generic `sendEmail`). Implementation is `StubNotificationAdapter`: logs the raw token via `Logger.log`, no real email provider. Explicitly documented as an MVP stub (comment cites decision "D9").
- **Password hashing**: `PasswordHasherPort` = `{ hash, verify }`, implemented by `Argon2HasherAdapter` (argon2id, OWASP 2023 params: memoryCost 65536, timeCost 3, parallelism 4).
- **`User` domain entity** (`domain/user.entity.ts`): plain class, fields `id, email, passwordHash, role, emailVerified, organizationId, createdAt, emailVerificationToken, emailVerificationExpiresAt`. No `passwordResetToken`/`passwordResetExpiresAt` fields exist.
- **Prisma schema** (`apps/api/prisma/schema.prisma`): `User` model has `emailVerificationToken String?` / `emailVerificationExpiresAt DateTime?` inline. **No `PasswordResetToken` model exists anywhere in the schema.**
- **Timing-attack / enumeration defenses already established** (`LoginUseCase`):
  - "D8": a precomputed dummy Argon2id hash (`DUMMY_HASH`) is verified against even when the user is not found, so "wrong password" and "unknown email" take the same code path and response shape (401, identical body). This is the exact pattern forgot-password must reuse for enumeration safety.
- **Tests**: unit specs use Vitest + hand-rolled port fakes (`buildUserRepository`, `buildPasswordHasher`, `buildNotificationPort` builder functions returning `vi.fn()` stubs, overridable per-test). E2E spec (`apps/api/test/auth.e2e-spec.ts`) is a single `describe.skipIf(!dbAvailable)` block, scenario IDs `S-AUTH-1` through `S-AUTH-13`, boots the full `AppModule` via `Test.createTestingModule`, overrides only `NOTIFICATION_PORT` to capture the raw token in a `Map`, reapplies `ValidationPipe` manually (bypassed by `createTestingModule`), uses `uniqueEmail(label)` helper for isolation. Skips entirely if no reachable Postgres.

**`apps/web` — auth pages**

- `app/(auth)/layout.tsx`: shared gradient + Wordmark + centered column wrapper for all auth pages (spec reference: "web-visual-coherence — Auth Surface Cohesion", but see Open Questions below — **this spec ID does not exist** in `openspec/specs/`).
- `app/(auth)/login/page.tsx` + `components/auth/LoginForm.tsx`: **confirmed — zero "¿Olvidaste tu contraseña?" link or affordance anywhere.** Login only shows a register-prompt link.
- `app/(auth)/register/page.tsx` + `RegisterForm.tsx`: same layout convention, submits through the **generic Bearer-injecting proxy** `POST /api/backend/auth/register` (no session cookie side-effect, so no bespoke route handler needed).
- `app/(auth)/verify-email/page.tsx`: **the pattern to mirror for reset-password**. Async Server Component reading `searchParams.token`, calling `serverFetch` server-side, rendering one of two `StatusPanel` outcomes (`success` / `error`) with distinct CTAs — no client-side form, no bespoke route.
- Two BFF patterns coexist:
  1. **Dedicated route handler** (`app/api/auth/login/route.ts`): used only when a cookie must be set — validates body shape itself, calls `serverFetch("/auth/login", …)`, on success calls `setSessionCookie(accessToken)`. This is "the only place a session cookie is ever set."
  2. **Generic catch-all proxy** (`app/api/backend/[...path]/route.ts` + client-side `clientFetch`): used for everything else (register, and by extension anything with no cookie side-effect) — forwards to backend, injects `Authorization: Bearer` from the existing session if present.
  - Forgot/reset-password have **no cookie side-effect** → they belong on the generic proxy path, same as register, not a bespoke route handler.
- `dictionaries/es/auth.ts`: single source of truth for all auth copy (`register`, `verifyEmail`, `login` sections). No `forgotPassword`/`resetPassword` keys yet. File header comment explicitly says copy is grounded in a spec ("spec #257") whose scenarios must not be paraphrased — reinforces the "dictionary key, not literal copy" rule from `openspec/config.yaml`.
- `lib/validation/auth.ts`: client-side pre-validation mirrors the backend regex exactly (comment flags this explicitly) — `validateRegisterForm`/`validateLoginForm`. A `validateForgotPasswordForm`/`validateResetPasswordForm` pair would follow the same convention (email shape check; password-policy regex reused for the new password field on reset).
- `lib/api/errors.ts`: `mapApiError(status, context)` — `ApiErrorContext` is a closed string union (`"login" | "register" | "review" | "confirm" | "anchor"`) that will need `"forgotPassword" | "resetPassword"` added.

### Affected Areas

**apps/api**
- `src/modules/auth/auth.controller.ts` — add `POST /auth/forgot-password`, `POST /auth/reset-password`
- `src/modules/auth/auth.module.ts` — register 2 new use cases, no new ports needed
- `src/modules/auth/dto/` — new `forgot-password.dto.ts`, `reset-password.dto.ts`
- `src/application/auth/` — new `forgot-password.use-case.ts`, `reset-password.use-case.ts` (+ `.spec.ts` each, TDD)
- `src/ports/notification.port.ts` — add `sendPasswordResetEmail(email, rawToken): Promise<void>`
- `src/adapters/notification/stub-notification.adapter.ts` — implement the new method (same log-and-stub pattern)
- `src/ports/user-repository.port.ts` — add `findByPasswordResetToken(tokenHash)`, `setPasswordResetToken(userId, tokenHash, expiresAt)`, `resetPassword(userId, newPasswordHash)` (naming TBD in design)
- `src/adapters/prisma/user.repository.ts` — implement the above against Prisma
- `src/domain/user.entity.ts` — add `passwordResetToken`/`passwordResetExpiresAt` fields + `hasValidPasswordResetToken(hash)` method (mirrors `hasValidVerificationToken`)
- `prisma/schema.prisma` — add 2 nullable columns to `User` (mirrors verify-email columns) + a migration
- `test/auth.e2e-spec.ts` — extend with `S-AUTH-14..N` scenarios

**apps/web**
- `app/(auth)/login/page.tsx` / `LoginForm.tsx` — add the "¿Olvidaste tu contraseña?" link
- `app/(auth)/forgot-password/page.tsx` + `components/auth/ForgotPasswordForm.tsx` — new (form: email only)
- `app/(auth)/reset-password/page.tsx` — new, Server-Component-first like `verify-email` but needs a client form for the new password (token from `searchParams`, form posts token + new password)
- `components/auth/ResetPasswordForm.tsx` — new client form
- `dictionaries/es/auth.ts` — add `forgotPassword` / `resetPassword` sections
- `lib/validation/auth.ts` — add `validateForgotPasswordForm`, `validateResetPasswordForm`
- `lib/api/errors.ts` — extend `ApiErrorContext`, add mapping branches
- Both new forms submit through `POST /api/backend/auth/forgot-password` / `POST /api/backend/auth/reset-password` (generic proxy, no cookie side-effect) — no new route handlers needed under `app/api/auth/`.

### Open Questions — Answered

**A. Verify-email token storage pattern?**
DB-backed, **not** a separate table and **not** JWT-based. Two nullable columns directly on `User` (`emailVerificationToken` = SHA-256 hash, `emailVerificationExpiresAt` = DateTime). Raw token = `uuidv4()`, generated in the use case, only its hash persisted. Validation combines a repository lookup by hash (`findByVerificationToken`) with an entity method (`hasValidVerificationToken`) that checks hash match + expiry. Single-use: consuming the token nulls both columns.
→ **Recommendation: mirror exactly** — add `passwordResetToken` / `passwordResetExpiresAt` columns to `User` rather than a new `PasswordResetToken` model. Introducing a separate table here would be inconsistent with the established pattern for zero added benefit at this scale (single active token per user, no need to query reset-token history).

**B. Is `NotificationPort` real or a stub?**
Confirmed **stub**. `StubNotificationAdapter` only logs `email` + raw token via `Logger.log`. No SMTP/provider integration exists anywhere in the codebase (no SendGrid/SES/Resend/nodemailer dependency found in the adapters directory).
→ **Recommendation: keep the stub, extend it.** Add `sendPasswordResetEmail(email, rawToken)` to `NotificationPort` and implement it in `StubNotificationAdapter` with the same log-and-stub approach used for verification email. Implementing a real email provider is out of scope for this change (register/verify-email haven't needed one yet either) — flag as a follow-up change if the team wants real delivery before production launch. This keeps the change consistent with existing MVP scope and avoids introducing new infra (API keys, provider config) into a UX-focused change.

**C. What Prisma migration is needed?**
New fields on `User`, not a new model: `passwordResetToken String?` and `passwordResetExpiresAt DateTime?` — same shape as the existing verify-email columns. A single additive migration (`ALTER TABLE users ADD COLUMN ...`), no new tables, no index changes required (lookup by hash uses the existing unscoped `findFirst` style already used for `findByVerificationToken`, no explicit DB index on that column today either — consistent, not a regression).

**D. Is adding 2 endpoints to `AuthController`/`AuthModule` straightforward?**
Yes. The controller is a thin `@Post`/`@Get` dispatch layer delegating to one use case per endpoint; `AuthModule`'s provider list is a flat array. Adding `ForgotPasswordUseCase` and `ResetPasswordUseCase` to both is a mechanical, low-risk change — no new ports, no restructuring. The only new port surface is the one extra `NotificationPort` method (additive, not breaking).

**E. Test patterns for existing auth use cases?**
- Unit: `apps/api/src/application/auth/{register,login,verify-email}.use-case.spec.ts` — Vitest, no DI container, manual builder functions per port returning `vi.fn()`-based fakes with sensible defaults, overridable per test via `Partial<Port>`. New use cases should add `forgot-password.use-case.spec.ts` and `reset-password.use-case.spec.ts` following the exact same builder-function convention.
- E2E: single file `apps/api/test/auth.e2e-spec.ts`, one `describe.skipIf(!dbAvailable)("Auth E2E (S-AUTH-1..13 + GET /auth/me)", ...)` block. New scenarios continue the `S-AUTH-N` numbering from 14 onward. `strict_tdd: true` in `openspec/config.yaml` means tasks must be planned RED→GREEN per use case.
- No dedicated unit spec exists for `AuthController` itself — coverage is via use-case units + e2e. Consistent pattern to follow for the new endpoints (no controller unit test needed).

**F. Email enumeration on forgot-password?**
Standard practice, and this codebase already has the *exact* precedent to reuse: `LoginUseCase`'s "D8" pattern (dummy hash verified on every path so response timing/shape doesn't leak whether an email is registered). For forgot-password:
- **`POST /auth/forgot-password` MUST always return `200 { ok: true }` regardless of whether the email exists** — never 404/409 for "email not found."
- Only *inside* the use case, conditionally: if the user exists, generate+store the reset token and call `notificationPort.sendPasswordResetEmail`; if not, do nothing (no DB write, no notification call) but still return the same 200 response to the controller.
- Timing: unlike login (which does a password verify — an expensive, constant-time-sensitive operation), forgot-password only does a DB lookup + conditional write, so exact timing equalization (dummy-hash-style) is lower priority, but the **response shape must be identical on both paths** — this is the main enumeration vector.
- `reset-password` (token + new password) is a separate concern: invalid/expired/already-used token → 400 (same as `verify-email`'s `S-AUTH-7` precedent), since the token itself is unguessable (not user input tied to an email) — no enumeration risk there.

### Risks

- **No `openspec/specs/` domain covers auth today.** Neither a `web-auth-flow` nor an `api-auth` spec exists in `openspec/specs/` despite code comments referencing "spec: web-auth-flow" and "spec #257" (likely a pre-SDD or external issue-tracker reference, not an OpenSpec artifact). **This means `sdd-spec` cannot write a pure delta against an existing base spec for the auth domain** — it will either need to (a) create the `web-auth-flow`/`api-auth` spec from scratch covering existing register/login/verify-email behavior first (larger scope than "add forgot password"), or (b) scope the delta narrowly to just forgot/reset-password as a new spec file, accepting that it doesn't formally supersede the un-specified existing auth behavior. **Recommend flagging this to the user before sdd-propose** — it's a process gap, not a code blocker.
- Password reset must invalidate all active JWT sessions is explicitly **not** handled by anything in this codebase (JWTs are stateless, 7-day expiry, no revocation list/blocklist exists). If the design wants "reset password ⇒ all other sessions die," that requires a new mechanism (e.g., a `passwordChangedAt` column checked in `JwtStrategy`, or a token version). Worth a design-time decision, not necessarily in scope for MVP but should be explicitly accepted/deferred rather than silently skipped.
- `RegisterDto`'s password-policy regex is duplicated in `apps/web/lib/validation/auth.ts` (comment explicitly warns to keep them in sync). The new-password field on reset-password must reuse the exact same regex on both sides — easy to get out of sync if copy-pasted instead of extracted.
- Rate-limiting: nothing in the codebase throttles `/auth/login`, `/auth/register`, or `/auth/verify-email` today (no guard/interceptor found). Forgot-password is a classic abuse target (mass token generation / email-bombing a victim). This is consistent with existing MVP scope (no rate limiting anywhere in auth), so likely out of scope here too, but should be an explicit call-out in design.md rather than an oversight.

### Ready for Proposal

**Yes.** The existing verify-email flow is a complete, working template for the exact shape of feature needed (DB-column token + expiry, hashed storage, single-use, stub notification, Server-Component landing page). The only open architectural decision worth surfacing to the user before/during `sdd-propose` is the missing base spec for the auth domain (see Risks) — everything else has a direct precedent in code.
