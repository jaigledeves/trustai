import { expect, test } from "@playwright/test";

/**
 * Covers `proxy.ts`'s edge-level guard (spec: "Guarded Route Session
 * Enforcement — /dtrs/*") through a real browser navigation, not just the
 * unit-level assertions in `proxy.test.ts`. Needs only the frontend dev
 * server — the redirect happens before any backend call, so no `apps/api`
 * availability check is required (unlike certify-golden-path.spec.ts /
 * public-verify.spec.ts).
 *
 * Overlap note: `certify-golden-path.spec.ts` never asserts this — it logs
 * in immediately and only visits `/dtrs*` while authenticated.
 * `smoke.spec.ts` asserts a DIFFERENT redirect (`/` -> `/login`, a hardcoded
 * `redirect()` in `app/page.tsx`, not the `proxy.ts` middleware). This spec
 * is the first e2e coverage of the actual guarded-route middleware behavior
 * against a real browser.
 */
test.describe("Guarded route session enforcement (/dtrs/*)", () => {
  test("visiting /dtrs without a session cookie redirects to /login", async ({ page }) => {
    await page.goto("/dtrs");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("visiting a nested /dtrs/:id route without a session cookie also redirects to /login", async ({
    page,
  }) => {
    await page.goto("/dtrs/some-id");
    await expect(page).toHaveURL(/\/login$/);
  });
});
