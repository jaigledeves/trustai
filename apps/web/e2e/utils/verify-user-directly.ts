import { Client } from "pg";

/**
 * Marks a just-registered user's email as verified directly in Postgres,
 * bypassing the real `/auth/verify-email?token=` flow.
 *
 * Why: `StubNotificationAdapter` (apps/api) intentionally only LOGS the raw
 * verification token (D9) — it is never exposed over HTTP. `apps/api`'s own
 * e2e suite captures it by overriding `NOTIFICATION_PORT` inside the same
 * Nest process (test/trust-records.e2e-spec.ts's `sentEmails` map); an
 * external, black-box Playwright test hitting a real running server has no
 * equivalent hook. The token-verification flow itself already has its own
 * dedicated coverage (page.test.tsx's msw-mocked scenarios); this golden
 * path is testing the certify wizard end-to-end, not re-proving
 * verify-email, so cheating past it here is a deliberate, narrow scope cut.
 */
export async function verifyUserDirectly(
  email: string,
  databaseUrl: string = process.env["DATABASE_URL"] ??
    "postgresql://postgres:postgres@localhost:5432/trustai_dev",
): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('UPDATE users SET "emailVerified" = true WHERE email = $1', [email]);
  } finally {
    await client.end();
  }
}
