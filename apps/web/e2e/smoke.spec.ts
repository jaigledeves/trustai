import { expect, test } from "@playwright/test";

// Smoke spec: proves the Playwright runner and dev server wiring work
// end-to-end. Root "/" now serves the public marketing landing (it used to
// redirect to /login); the landing exposes the primary CTAs into the app.
// Real golden-path specs land in certify-golden-path.spec.ts,
// public-verify.spec.ts and guarded-route.spec.ts.
test("root path serves the landing with entry CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("link", { name: "Crear cuenta", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
});
