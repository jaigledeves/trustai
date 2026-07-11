#!/usr/bin/env node
/**
 * Seeds a pre-verified demo user so a reviewer can log in and run the full
 * certify flow without needing the email-verification token (the stub
 * notifier only LOGS the token, it never sends a real email — see
 * apps/api/src/adapters/notification/stub-notification.adapter.ts).
 *
 * Strategy (two steps, reusing the real code path for the hard parts):
 *   1. Register through the live API so password hashing (argon2) and the
 *      Organization + admin User creation run through the real use case.
 *      A 409 (already registered) is treated as success — the script is
 *      idempotent and safe to re-run.
 *   2. Flip emailVerified = true directly via Prisma — mirroring
 *      apps/web/e2e/utils/verify-user-directly.ts.
 *
 * Usage against production (PowerShell):
 *   $env:API_BASE_URL="https://trustaiapi-production.up.railway.app"
 *   $env:DATABASE_URL="postgresql://...railway..."
 *   pnpm --filter @trustai/api seed:demo
 *
 * Defaults target a local stack. Credentials can be overridden with
 * DEMO_EMAIL / DEMO_PASSWORD (keep them in sync with the README).
 */
import { PrismaClient } from "@prisma/client";

const email = process.env["DEMO_EMAIL"] ?? "revisor@trustai.app";
const password = process.env["DEMO_PASSWORD"] ?? "RevisorTFM2026";
const apiBaseUrl = process.env["API_BASE_URL"] ?? "http://localhost:3000";

async function main() {
  // 1. Register via the real API (idempotent: 409 = already exists).
  const response = await fetch(new URL("/auth/register", apiBaseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (response.status === 201) {
    console.log(`Registered new demo user: ${email}`);
  } else if (response.status === 409) {
    console.log(`Demo user ${email} already exists — verifying it.`);
  } else {
    const body = await response.text();
    throw new Error(`Register failed (HTTP ${response.status}): ${body}`);
  }

  // 2. Mark the email verified directly (the token is never emailed).
  const prisma = new PrismaClient();
  try {
    await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log("\nDemo user ready to log in:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
}

main().catch((error) => {
  console.error("\nSeed failed:", error.message ?? error);
  process.exit(1);
});
