# Proposal: Forgot / Reset Password

## Intent

Users who forget their password have no self-service recovery path today —
`AuthController` only exposes register/verify-email/login. This adds a
standard forgot-password → email-link → reset-password flow across
`apps/api` and `apps/web`, mirroring the existing verify-email token pattern
exactly so the codebase gains one recovery flow, not two divergent token
mechanisms.

## Scope

**Packages touched**: `apps/api` (NestJS, hexagonal), `apps/web` (Next.js BFF).

### In Scope
- `POST /auth/forgot-password` — always `200 { ok: true }` (enumeration-safe)
- `POST /auth/reset-password` — token + new password → success or `400`
- Two new nullable `User` columns (`passwordResetToken`, `passwordResetExpiresAt`), same shape as verify-email's columns — no new Prisma model
- `NotificationPort.sendPasswordResetEmail` on the existing stub adapter
- `/forgot-password` and `/reset-password` pages, forms, dictionary copy, and a "¿Olvidaste tu contraseña?" link on `LoginForm`

### Out of Scope
- Real email delivery (notifier stays a stub — affects verify-email too; real provider integration is a separate follow-up change)
- Rate-limiting on any auth endpoint (none exists today; explicit MVP gap, not introduced here)
- Revoking existing JWT sessions on password reset (JWTs are stateless with no revocation mechanism today; would need a new `passwordChangedAt`/token-version mechanism — deferred)

## Capabilities

### New Capabilities
- `auth-password-recovery`: forgot/reset-password flow (API endpoints + web pages) as one narrow capability. No `openspec/specs/` domain exists yet for auth (register/login/verify-email predate SDD), so this is a full new spec, not a delta — it does not attempt to backfill existing auth behavior.

### Modified Capabilities
None.

## Approach

Mirror `RegisterUseCase`'s token generation and `VerifyEmailUseCase`'s
validation exactly: raw `uuidv4()` token, SHA-256 hash + expiry stored on
`User`, single-use by clearing both columns on consumption. Enumeration
defense mirrors `LoginUseCase`'s "D8" precedent (identical response shape
regardless of whether the email exists) applied to `forgot-password`'s
response, not to timing.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/prisma/schema.prisma` | Modified | 2 nullable columns on `User` |
| `apps/api/src/application/auth/` | New | `forgot-password.use-case.ts`, `reset-password.use-case.ts` |
| `apps/api/src/modules/auth/` | Modified | 2 endpoints, 2 DTOs, module wiring |
| `apps/api/src/ports/notification.port.ts` | Modified | +1 method |
| `apps/web/app/(auth)/` | New | `forgot-password/`, `reset-password/` pages |
| `apps/web/components/auth/` | New/Modified | 2 new forms, `LoginForm` link |
| `apps/web/dictionaries/es/auth.ts` | Modified | 2 new copy groups |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| No rate limiting → mass token generation / email-bombing | Medium | Explicit MVP gap, flagged in design; consistent with existing auth endpoints |
| Reset doesn't kill other sessions | Low | Explicitly deferred; documented as a known MVP limitation |
| Password regex drifts between web/api | Low | Reuse exact existing regex, no new abstraction introduced |

## Rollback Plan

Revert the feature commits and drop the migration
(`prisma migrate resolve` + a down migration removing the 2 columns). No
data migration or backfill is involved — the columns are additive and
nullable, so rollback has zero impact on existing rows.

## Success Criteria

- [ ] `POST /auth/forgot-password` always returns `200 { ok: true }`
- [ ] `POST /auth/reset-password` accepts a valid token once, rejects reuse/expiry with `400`
- [ ] Login page links to `/forgot-password`; reset success links to `/login`
- [ ] All new copy lives in `dictionaries/es/auth.ts`, none hardcoded
