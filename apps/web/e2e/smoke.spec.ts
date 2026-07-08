import { expect, test } from "@playwright/test";

// Placeholder smoke spec (Phase 1.1.4): proves the Playwright runner and
// dev server wiring work end-to-end before any real page exists to test.
// Real golden-path specs land in Phase 3 (certify-golden-path.spec.ts),
// Phase 5 (public-verify.spec.ts) and Phase 6 (guarded-route.spec.ts).
test("root path redirects to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
