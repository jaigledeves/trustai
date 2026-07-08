import { defineConfig, devices } from "@playwright/test";

// E2E specs (Phase 3+) exercise the full golden path against a real (or
// docker-composed) NestJS API — see design.md's Testing Strategy. This
// config only wires up the runner; it intentionally does NOT start
// `apps/api` for you (that's `infrastructure/docker-compose.yml`'s job) so
// CI/local runs can point `NEXT_PUBLIC_API_BASE_URL`/`API_BASE_URL` at
// whichever backend instance is already running.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
