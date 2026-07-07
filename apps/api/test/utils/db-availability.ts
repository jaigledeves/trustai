import { PrismaClient } from "@prisma/client";

const CONNECT_TIMEOUT_MS = 3_000;

/**
 * Best-effort check used to skip e2e specs gracefully in environments where
 * PostgreSQL is not reachable (e.g. this repo's CI/dev sandbox may not have
 * Docker/Postgres running) — per D7, e2e specs are meant to run against a
 * real ephemeral Postgres, not a mock, but we must not hard-fail the whole
 * suite when that infra simply isn't present.
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (!process.env["DATABASE_URL"]) {
    return false;
  }

  const prisma = new PrismaClient();
  try {
    await Promise.race([
      prisma.$connect(),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error("DB connect timeout")), CONNECT_TIMEOUT_MS),
      ),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}
