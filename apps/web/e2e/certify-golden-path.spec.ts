import { expect, test } from "@playwright/test";
import { isApiAvailable } from "./utils/api-availability";
import { verifyUserDirectly } from "./utils/verify-user-directly";

/**
 * Hand-crafted minimal single-page PDF with a real extractable text layer
 * (same technique as apps/api/test/trust-records.e2e-spec.ts's
 * `buildMinimalPdf` — duplicated here rather than shared, since `apps/web`
 * and `apps/api` don't share a test-fixtures package).
 */
function buildMinimalPdf(contentStream: string): Buffer {
  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    4: `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`,
    5: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  };
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf, "utf8");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

test.describe("Certify golden path (register -> verify -> login -> certify -> anchor)", () => {
  test.beforeAll(async () => {
    const available = await isApiAvailable();
    test.skip(
      !available,
      "apps/api is not reachable at E2E_API_BASE_URL/http://localhost:3000 — start the API " +
        "(and Postgres/MinIO) to run this spec.",
    );
  });

  test("register, verify, log in, upload, review, confirm, and submit for anchoring", async ({
    page,
  }) => {
    // Generous budget: the Next dev server compiles each route on first hit,
    // and the real analyze-document job runs async between upload and review.
    test.setTimeout(90_000);

    const email = `e2e-golden-${Date.now()}@example.com`;
    const password = "Password123";

    // 1. Register
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Registrarme" }).click();
    await expect(
      page.getByText("Revisa tu email para verificar tu cuenta antes de iniciar sesión."),
    ).toBeVisible();

    // 2. Verify — StubNotificationAdapter never exposes the raw token over
    // HTTP (D9, intentional); see verify-user-directly.ts for why this
    // golden path marks the email verified directly instead of scraping
    // server logs. The token-verification UI flow has its own dedicated
    // coverage in app/(auth)/verify-email/page.test.tsx.
    await verifyUserDirectly(email);

    // 3. Log in
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL(/\/dtrs$/);

    // `/dtrs` (history list) doesn't exist until Phase 4 — navigate
    // directly to the certify entry point rather than relying on that page.
    await page.goto("/dtrs/new");
    await expect(
      page.getByRole("heading", { name: "Certificar un documento" }),
    ).toBeVisible();

    // 4. Upload
    await page
      .getByLabel("Elige un archivo PDF para certificar")
      .setInputFiles({
        name: "sample.pdf",
        mimeType: "application/pdf",
        buffer: buildMinimalPdf("BT /F1 24 Tf 50 100 Td (E2E golden path) Tj ET"),
      });
    await page.getByRole("button", { name: "Subir documento" }).click();
    await page.waitForURL(/\/dtrs\/[^/]+$/);

    // 5. Review — wait for the real analyze-document job to populate the summary.
    await expect(page.getByLabel("Resumen")).not.toHaveValue("", { timeout: 20_000 });

    // 6. Confirm — DRAFT -> READY, canonicalHash frozen as evidence.
    await page.getByRole("button", { name: "Confirmar certificación" }).click();
    await expect(page.getByText("Huella del registro")).toBeVisible({
      timeout: 10_000,
    });

    // 7. Anchor — READY -> ANCHORING (non-blocking, immediate) is the terminal
    // observable state of the *web* golden path. Reaching CERTIFIED requires
    // configured chain infra (CHAIN_RPC_URL / WORKER_WALLET_PRIVATE_KEY /
    // ANCHOR_CONTRACT_ADDRESS + the confirm-anchor job); without it the
    // default ChainNotConfiguredAnchorAdapter can't advance past ANCHORING.
    // That backend chain->CERTIFIED transition is owned by apps/api's
    // env-gated chain-integration e2e, not this frontend flow — here we prove
    // the full wizard: register -> verify -> login -> upload -> analyze ->
    // review -> confirm(frozen hash) -> anchor(submit + poll).
    await page.getByRole("button", { name: "Finalizar certificación" }).click();
    await expect(
      page.getByText("Anclando tu documento en la blockchain… esto puede tardar unos minutos."),
    ).toBeVisible();
  });
});
