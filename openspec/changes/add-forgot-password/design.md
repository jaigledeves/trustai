# Design: Forgot / Reset Password

## Technical Approach

Mirror the verify-email flow (`RegisterUseCase` token generation +
`VerifyEmailUseCase` validation) exactly: hashed token + expiry on two new
`User` columns, no new Prisma model. Two new use cases, two new endpoints,
one new `NotificationPort` method, no new ports.

## Architecture Decisions

| Decision | Choice | Alternative considered | Rationale |
|----------|--------|------------------------|-----------|
| Token storage | 2 nullable columns on `User` (mirrors verify-email) | Separate `PasswordResetToken` table | Single active token per user, no history needed — a new table adds a join for zero benefit at this scale (per exploration Q-A) |
| Enumeration defense | `forgot-password` always `200 { ok: true }`; conditional DB write inside use case | Return `404` for unknown email | `LoginUseCase`'s D8 precedent already established this pattern; a `404` would leak account existence |
| **isVerified on reset** | Set `emailVerified = true` on successful reset | Leave untouched | Possessing a working reset link is proof of email ownership, equal to the verify-email token. Without this, a user who never verified is **permanently locked out** — `LoginUseCase` rejects unverified accounts even with a correct password (S-AUTH-10a), and reset-password would not fix that. Setting it here closes a real dead-end, at zero extra cost (same `resetPassword` repository call already touches the row) |
| Password hashing | Reuse `PASSWORD_HASHER_PORT` (Argon2) | New port | Register/login already own this; no reason to diverge |
| Notifier | Extend existing `StubNotificationAdapter` | Real email provider | User-approved: stays a stub. Real delivery is a follow-up affecting register too |

## Explicit Out-of-Scope Call-outs (MVP)

- **Rate limiting**: no guard/interceptor exists on any `/auth/*` route today (register/login/verify-email included). Forgot-password is a classic abuse target (mass token generation, email-bombing a victim). Not introduced here — consistent with existing scope, but flagged so it isn't silently missed before a real launch.
- **JWT session revocation on reset**: JWTs are stateless (7-day expiry, no blocklist). A password reset does **not** invalidate already-issued tokens for that user. Fixing this needs a new mechanism (`passwordChangedAt` checked in `JwtStrategy`, or a token version claim) — deferred, explicitly accepted as an MVP gap, not an oversight.

## Sequence: Forgot Password

```
Client            ForgotPasswordForm      BFF proxy         AuthController      ForgotPasswordUseCase   UserRepository   NotificationPort
  │ submit email        │                     │                    │                     │                    │                │
  │─────────────────────▶ POST /api/backend/auth/forgot-password ─▶│                     │                    │                │
  │                      │                     │─────────────────▶│ forgotPassword(dto) │                    │                │
  │                      │                     │                    │────────────────────▶ execute(email)    │                │
  │                      │                     │                    │                     │──findByEmail─────▶│                │
  │                      │                     │                    │                     │◀──user|null───────│                │
  │                      │                     │                    │                     │  (if user) genToken, setPasswordResetToken │
  │                      │                     │                    │                     │────────────────────▶ save hash+expiry │
  │                      │                     │                    │                     │  (if user) sendPasswordResetEmail(email, rawToken) ─▶ logs (stub)
  │                      │                     │                    │◀── {ok:true} (always) │                    │                │
  │◀── 200 {ok:true} always, enumeration-safe copy ──────────────────────────────────────────────────────────────────────────────│
```

## Sequence: Reset Password

```
Client            ResetPasswordForm       BFF proxy         AuthController      ResetPasswordUseCase    UserRepository
  │ open /reset-password?token=X │              │                    │                     │                    │
  │  enter newPassword+confirm   │              │                    │                     │                    │
  │──────────────────────────────▶ POST /api/backend/auth/reset-password {token,newPassword} ▶│                    │
  │                              │              │─────────────────▶│ resetPassword(dto)  │                    │
  │                              │              │                    │────────────────────▶ execute(token,pw) │                    │
  │                              │              │                    │                     │──findByPasswordResetToken(hash)──▶│
  │                              │              │                    │                     │◀──user|null───────│
  │                              │              │                    │  invalid/expired → throw BadRequestException (400)     │
  │                              │              │                    │  valid → hash(newPassword) → resetPassword(id, hash)   │
  │                              │              │                    │────────────────────▶ clear tokens, set passwordHash, emailVerified=true │
  │◀── 200 success | 400 invalid/expired ────────────────────────────────────────────────────────────────────────────────────│
```

## Prisma Migration

Additive only, no data migration:

```prisma
model User {
  // ...existing fields
  passwordResetToken      String?
  passwordResetExpiresAt  DateTime?
}
```

`prisma migrate dev --name add_password_reset_fields_to_user` generates
`ALTER TABLE users ADD COLUMN "passwordResetToken" TEXT, ADD COLUMN
"passwordResetExpiresAt" TIMESTAMP(3)`. No index (consistent with the
existing unindexed `emailVerificationToken` lookup via `findFirst`).

## File-by-File Plan

| File | Action |
|------|--------|
| `apps/api/prisma/schema.prisma` | Modify — 2 columns |
| `apps/api/src/domain/user.entity.ts` | Modify — 2 fields + `hasValidPasswordResetToken(hash)` |
| `apps/api/src/ports/user-repository.port.ts` | Modify — `findByPasswordResetToken`, `setPasswordResetToken`, `resetPassword` |
| `apps/api/src/ports/notification.port.ts` | Modify — `sendPasswordResetEmail` |
| `apps/api/src/adapters/prisma/user.repository.ts` | Modify — implement 3 new methods |
| `apps/api/src/adapters/notification/stub-notification.adapter.ts` | Modify — implement new method |
| `apps/api/src/application/auth/forgot-password.use-case.ts` (+`.spec.ts`) | New |
| `apps/api/src/application/auth/reset-password.use-case.ts` (+`.spec.ts`) | New |
| `apps/api/src/modules/auth/dto/forgot-password.dto.ts`, `reset-password.dto.ts` | New |
| `apps/api/src/modules/auth/auth.controller.ts`, `auth.module.ts` | Modify — 2 endpoints, 2 providers |
| `apps/api/test/auth.e2e-spec.ts` | Modify — `S-AUTH-14..N` |
| `apps/web/app/(auth)/forgot-password/page.tsx`, `reset-password/page.tsx` | New |
| `apps/web/components/auth/ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx` | New |
| `apps/web/components/auth/LoginForm.tsx` | Modify — forgot-password link |
| `apps/web/dictionaries/es/auth.ts` | Modify — 2 new copy groups |
| `apps/web/lib/validation/auth.ts` | Modify — `validateForgotPasswordForm`, `validateResetPasswordForm` |
| `apps/web/lib/api/errors.ts` | Modify — `ApiErrorContext` +`"forgotPassword"\|"resetPassword"`, `resetPassword` 400 branch |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (api) | Both use cases, enumeration branch, expiry/hash logic | Vitest + builder-fake ports, mirrors `verify-email.use-case.spec.ts` |
| E2E (api) | `S-AUTH-14+`: happy path, unknown-email 200, expired/reused token 400, weak password 400, post-reset login works, unverified-becomes-verified | `auth.e2e-spec.ts` extension |
| Unit (web) | Form validation, mismatch blocking, error/success states | Vitest + Testing Library, mirrors `LoginForm.test.tsx` |

**TDD order (strict_tdd)**: domain entity method → repository port/adapter →
`ForgotPasswordUseCase` (RED→GREEN) → `ResetPasswordUseCase` (RED→GREEN) →
controller/DTOs → e2e → web validation → web forms/pages.

## Open Questions

None — all decisions resolved per user input.
