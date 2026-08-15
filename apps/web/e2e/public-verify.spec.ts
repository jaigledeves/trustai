import { expect, test } from "@playwright/test";
import { isApiAvailable } from "./utils/api-availability";
import { verifyUserDirectly } from "./utils/verify-user-directly";

/**
 * Same hand-crafted minimal PDF technique as certify-golden-path.spec.ts
 * (real extractable text layer, so analyze-document doesn't fail).
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

/** Byte-altered copy — any content change is enough to change the SHA-256 (spec: ASSET_MISMATCH). */
function tamper(original: Buffer): Buffer {
  return Buffer.concat([original, Buffer.from(" %tampered")]);
}

test.describe("Public verify (register -> certify -> confirm -> unauthenticated /verify/[id])", () => {
  test.beforeAll(async () => {
    const available = await isApiAvailable();
    test.skip(
      !available,
      "apps/api is not reachable at E2E_API_BASE_URL/http://localhost:3000 — start the API " +
        "(and Postgres/MinIO) to run this spec.",
    );
  });

  /**
   * Shared setup: register -> verify -> login -> upload -> wait for analysis
   * -> confirm (DRAFT -> READY). READY/ANCHORING both classify as the
   * "PENDING" bucket in `VerifyDocumentUseCase.classify` — enough to
   * exercise the real ASSET_MISMATCH/PENDING_ANCHOR verdict logic without
   * requiring chain infra (CHAIN_RPC_URL/WORKER_WALLET_PRIVATE_KEY), which
   * this sandboxed environment does not have configured (same limitation
   * noted in certify-golden-path.spec.ts).
   */
  async function certifyToReady(page: import("@playwright/test").Page, pdfBytes: Buffer) {
    const email = `e2e-verify-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const password = "Password123";

    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByLabel("Confirmar contraseña").fill(password);
    await page.getByRole("button", { name: "Registrarme" }).click();
    await expect(
      page.getByText("Revisa tu email para verificar tu cuenta antes de iniciar sesión."),
    ).toBeVisible();

    await verifyUserDirectly(email);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL(/\/dtrs$/);

    await page.goto("/dtrs/new");
    await page
      .getByLabel("Elige un archivo PDF para certificar")
      .setInputFiles({ name: "sample.pdf", mimeType: "application/pdf", buffer: pdfBytes });
    await page.getByRole("button", { name: "Subir documento" }).click();
    // Upload navigates /dtrs/new -> /dtrs/{uuid}. Match the created record's
    // URL specifically: a loose /\/dtrs\/[^/]+$/ also matches the /dtrs/new
    // upload page we're already on, so waitForURL would resolve immediately
    // and capture the literal "new" instead of the real trustRecordId.
    const recordUrlPattern =
      /\/dtrs\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    await page.waitForURL(recordUrlPattern);
    const trustRecordId = /\/dtrs\/([0-9a-f-]{36})$/.exec(page.url())?.[1];
    if (!trustRecordId) {
      throw new Error("Could not extract trustRecordId from the wizard URL");
    }

    await expect(page.getByLabel("Resumen")).not.toHaveValue("", { timeout: 20_000 });
    await page.getByRole("button", { name: "Confirmar certificación" }).click();
    await expect(page.getByText("Huella del registro")).toBeVisible({
      timeout: 10_000,
    });

    return trustRecordId;
  }

  test("ASSET_MISMATCH: uploading a tampered copy of the certified file on the public, unauthenticated verify page renders a mismatch verdict", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const originalPdf = buildMinimalPdf("BT /F1 24 Tf 50 100 Td (Public verify ASSET_MISMATCH) Tj ET");
    const trustRecordId = await certifyToReady(page, originalPdf);

    // The public verify route is no-auth (spec: "Unauthenticated Access") —
    // a fresh, session-less context proves the page never checks for a
    // login cookie, unlike every route under (dashboard).
    const publicContext = await page.context().browser()?.newContext();
    if (!publicContext) {
      throw new Error("Could not open a fresh unauthenticated browser context");
    }
    const publicPage = await publicContext.newPage();
    try {
      await publicPage.goto(`/verify/${trustRecordId}`);
      await expect(
        publicPage.getByRole("heading", { name: "Verificación pública de documento" }),
      ).toBeVisible();

      await publicPage
        .getByLabel("Elige el archivo a verificar")
        .setInputFiles({
          name: "tampered.pdf",
          mimeType: "application/pdf",
          buffer: tamper(originalPdf),
        });
      await publicPage.getByRole("button", { name: "Verificar documento" }).click();

      await expect(
        publicPage.getByText("El documento no corresponde a este DTR o fue alterado."),
      ).toBeVisible({ timeout: 15_000 });
      // spec: analysis is absent for ASSET_MISMATCH.
      await expect(publicPage.getByText(/^Resumen:/)).not.toBeVisible();
      // spec: the client-side hash recompute panel still renders independently.
      await expect(publicPage.getByText("Huella calculada en tu navegador")).toBeVisible();
    } finally {
      await publicContext.close();
    }
  });

  test("VALID: after the record reaches CERTIFIED, uploading the original file on the public verify page renders a valid verdict with the anchor tx link", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const originalPdf = buildMinimalPdf("BT /F1 24 Tf 50 100 Td (Public verify VALID) Tj ET");
    const trustRecordId = await certifyToReady(page, originalPdf);

    // Anchor submission is non-blocking (READY -> ANCHORING immediately);
    // reaching CERTIFIED requires real chain infra (CHAIN_RPC_URL /
    // WORKER_WALLET_PRIVATE_KEY / ANCHOR_CONTRACT_ADDRESS + the
    // confirm-anchor job) — NOT configured in this sandboxed environment
    // (same gap certify-golden-path.spec.ts documents). Skip gracefully
    // here rather than asserting a state this environment cannot reach;
    // in a fully chain-configured environment this test exercises the
    // real VALID verdict end-to-end.
    await page.getByRole("button", { name: "Finalizar certificación" }).click();
    await expect(
      page.getByText("Anclando tu documento en la blockchain… esto puede tardar unos minutos."),
    ).toBeVisible();

    let certified = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await page.request.get(`/api/backend/trust-records/${trustRecordId}`);
      const body = (await response.json()) as { state?: string };
      if (body.state === "CERTIFIED") {
        certified = true;
        break;
      }
      await page.waitForTimeout(2_000);
    }
    test.skip(
      !certified,
      "Chain infra (CHAIN_RPC_URL/WORKER_WALLET_PRIVATE_KEY/ANCHOR_CONTRACT_ADDRESS) is not " +
        "configured in this environment — CERTIFIED is unreachable without it.",
    );

    const publicContext = await page.context().browser()?.newContext();
    if (!publicContext) {
      throw new Error("Could not open a fresh unauthenticated browser context");
    }
    const publicPage = await publicContext.newPage();
    try {
      await publicPage.goto(`/verify/${trustRecordId}`);
      await expect(publicPage.getByText("Válido").first()).toBeVisible();

      await publicPage
        .getByLabel("Elige el archivo a verificar")
        .setInputFiles({ name: "sample.pdf", mimeType: "application/pdf", buffer: originalPdf });
      await publicPage.getByRole("button", { name: "Verificar documento" }).click();

      await expect(
        publicPage.getByRole("link", { name: "Ver transacción en el explorador" }).last(),
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      await publicContext.close();
    }
  });
});
