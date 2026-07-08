import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { computeCanonicalHash } from "@trustai/dtr-core";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaService } from "../src/adapters/prisma/prisma.service";
import { AppModule } from "../src/app.module";
import { NOTIFICATION_PORT } from "../src/ports/notification.port";
import { isDatabaseAvailable } from "./utils/db-availability";
import { isStorageAvailable } from "./utils/storage-availability";

const [dbAvailable, storageAvailable] = await Promise.all([
  isDatabaseAvailable(),
  isStorageAvailable(),
]);

/**
 * Hand-crafted minimal single-page PDF with byte-accurate xref offsets and
 * a real extractable text layer (same technique as
 * src/adapters/extraction/unpdf.adapter.spec.ts) — needed here (unlike
 * assets.e2e-spec.ts) because these tests must let the real
 * analyze-document job succeed end-to-end before review/confirm.
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

// D7: real Postgres + MinIO required (upload writes both a DB row and an
// encrypted S3 object, and the real pg-boss worker must run
// analyze-document for these tests to reach a confirmable DRAFT).
describe.skipIf(!dbAvailable || !storageAvailable)(
  "Trust Records E2E (dtr-lifecycle capability)",
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    const sentEmails = new Map<string, string>();

    function uniqueEmail(label: string): string {
      return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    }

    async function createAuthenticatedUser(
      label: string,
    ): Promise<{ accessToken: string; organizationId: string }> {
      const email = uniqueEmail(label);
      const password = "Password123";

      const registerRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email, password });

      const rawToken = sentEmails.get(email);
      await request(app.getHttpServer()).get(`/auth/verify-email?token=${rawToken}`);

      const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email, password });

      return {
        accessToken: loginRes.body.accessToken as string,
        organizationId: registerRes.body.organizationId as string,
      };
    }

    /** Uploads a real, text-extractable PDF and waits for the real analyze-document job to populate AI fields. */
    async function uploadAndWaitForAnalysis(
      accessToken: string,
      label: string,
    ): Promise<{ assetId: string; trustRecordId: string }> {
      const pdfBytes = buildMinimalPdf(`BT /F1 24 Tf 50 100 Td (${label}) Tj ET`);

      const uploadRes = await request(app.getHttpServer())
        .post("/assets")
        .set("Authorization", `Bearer ${accessToken}`)
        .attach("file", pdfBytes, { filename: `${label}.pdf`, contentType: "application/pdf" });
      expect(uploadRes.status).toBe(201);

      const { assetId, trustRecordId } = uploadRes.body as {
        assetId: string;
        trustRecordId: string;
      };

      const deadline = Date.now() + 15_000;
      let analyzed = false;
      while (Date.now() < deadline) {
        const record = await prisma.trustRecord.findUnique({ where: { id: trustRecordId } });
        if (record?.aiSummary && record.aiProvider) {
          analyzed = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!analyzed) {
        throw new Error(
          `Timed out waiting for analyze-document to populate AI fields for ${trustRecordId}`,
        );
      }

      return { assetId, trustRecordId };
    }

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(NOTIFICATION_PORT)
        .useValue({
          sendVerificationEmail: vi.fn(async (email: string, rawToken: string) => {
            sentEmails.set(email, rawToken);
          }),
        })
        .compile();

      app = moduleRef.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await app.init();
      prisma = moduleRef.get(PrismaService);
    });

    afterAll(async () => {
      await app?.close();
    });

    it("S-DTR-1: review edit persists and confirm computes a canonicalHash matching dtr-core's own reference computation (INV-22)", async () => {
      const userA = await createAuthenticatedUser("dtr-review-confirm");
      const { trustRecordId } = await uploadAndWaitForAnalysis(userA.accessToken, "S-DTR-1");

      const reviewRes = await request(app.getHttpServer())
        .patch(`/trust-records/${trustRecordId}/review`)
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send({ summary: "A human-reviewed, edited summary of the document." });
      expect(reviewRes.status).toBe(204);

      const afterReview = await prisma.trustRecord.findUnique({ where: { id: trustRecordId } });
      expect(afterReview?.aiSummary).toBe("A human-reviewed, edited summary of the document.");
      expect(afterReview?.reviewedByUserId).toBeTruthy();

      const confirmRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/confirm`)
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(confirmRes.status).toBe(201);
      expect(confirmRes.body.state).toBe("READY");
      expect(typeof confirmRes.body.canonicalHash).toBe("string");
      expect(confirmRes.body.canonicalHash).toHaveLength(64);

      const afterConfirm = await prisma.trustRecord.findUnique({ where: { id: trustRecordId } });
      expect(afterConfirm?.state).toBe("READY");
      expect(afterConfirm?.canonicalHash).toBe(confirmRes.body.canonicalHash);
      expect(afterConfirm?.issuedAt).toBeTruthy();

      // Independently reconstructed reference — proves the API's hash is
      // reproducible by a third party from only the DB's public fields,
      // not something only TrustAI's internals could recompute (the whole
      // point of INV-22).
      const asset = await prisma.digitalAsset.findUnique({
        where: { id: afterConfirm!.assetId },
      });
      const reference = await computeCanonicalHash({
        schemaVersion: afterConfirm!.schemaVersion,
        asset: {
          sha256: asset!.sha256,
          mimeType: asset!.mimeType,
          sizeBytes: asset!.sizeBytes,
          ...(asset!.filename ? { filename: asset!.filename } : {}),
        },
        analysis: {
          summary: afterConfirm!.aiSummary,
          classification: afterConfirm!.aiClassification,
          language: afterConfirm!.aiLanguage,
        },
        provenance: {
          provider: afterConfirm!.aiProvider,
          model: afterConfirm!.aiModel,
          modelVersion: afterConfirm!.aiModelVersion,
          promptVersion: afterConfirm!.aiPromptVersion,
          taxonomyVersion: afterConfirm!.aiTaxonomyVersion,
          analyzedAt: afterConfirm!.aiAnalyzedAt!.toISOString(),
        },
        issuedAt: afterConfirm!.issuedAt!.toISOString(),
      });
      expect(confirmRes.body.canonicalHash).toBe(reference);
    });

    it("S-DTR-2: confirming an already-READY record is rejected (INV-24: hash never recomputed)", async () => {
      const userA = await createAuthenticatedUser("dtr-double-confirm");
      const { trustRecordId } = await uploadAndWaitForAnalysis(userA.accessToken, "S-DTR-2");

      const first = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/confirm`)
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(first.status).toBe(201);

      const second = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/confirm`)
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(second.status).toBe(409);

      const record = await prisma.trustRecord.findUnique({ where: { id: trustRecordId } });
      expect(record?.canonicalHash).toBe(first.body.canonicalHash);
    });

    it("S-DTR-3: an invalid transition (e.g. CERTIFIED -> DRAFT-only operations) is rejected", async () => {
      const userA = await createAuthenticatedUser("dtr-invalid-transition");
      const { trustRecordId } = await uploadAndWaitForAnalysis(userA.accessToken, "S-DTR-3");

      // Seed a CERTIFIED record directly (Phase 6/7 anchoring isn't built
      // yet) to exercise the state machine's full-immutability guard
      // (INV-23) through the same code path a real anchored record would
      // hit — confirm/discard/review must all reject it identically.
      await prisma.trustRecord.update({
        where: { id: trustRecordId },
        data: { state: "CERTIFIED", canonicalHash: "a".repeat(64), issuedAt: new Date() },
      });

      const confirmRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/confirm`)
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(confirmRes.status).toBe(409);

      const discardRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/discard`)
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(discardRes.status).toBe(409);

      const reviewRes = await request(app.getHttpServer())
        .patch(`/trust-records/${trustRecordId}/review`)
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send({ summary: "Should not be allowed." });
      expect(reviewRes.status).toBe(409);

      const record = await prisma.trustRecord.findUnique({ where: { id: trustRecordId } });
      expect(record?.state).toBe("CERTIFIED");
    });

    it("S-DTR-4: cross-org access to review/confirm/discard returns 404, not 403", async () => {
      const userA = await createAuthenticatedUser("dtr-cross-org-a");
      const userB = await createAuthenticatedUser("dtr-cross-org-b");
      const { trustRecordId } = await uploadAndWaitForAnalysis(userA.accessToken, "S-DTR-4");

      const reviewRes = await request(app.getHttpServer())
        .patch(`/trust-records/${trustRecordId}/review`)
        .set("Authorization", `Bearer ${userB.accessToken}`)
        .send({ summary: "Not yours to edit." });
      expect(reviewRes.status).toBe(404);

      const confirmRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/confirm`)
        .set("Authorization", `Bearer ${userB.accessToken}`)
        .send();
      expect(confirmRes.status).toBe(404);

      const discardRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/discard`)
        .set("Authorization", `Bearer ${userB.accessToken}`)
        .send();
      expect(discardRes.status).toBe(404);

      // Confirm the owner's org can still operate normally afterward.
      const ownerConfirm = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/confirm`)
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(ownerConfirm.status).toBe(201);
    });

    it("S-DTR-5: discard moves a DRAFT record to DISCARDED", async () => {
      const userA = await createAuthenticatedUser("dtr-discard");
      const { trustRecordId } = await uploadAndWaitForAnalysis(userA.accessToken, "S-DTR-5");

      const discardRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/discard`)
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(discardRes.status).toBe(204);

      const record = await prisma.trustRecord.findUnique({ where: { id: trustRecordId } });
      expect(record?.state).toBe("DISCARDED");
    });

    it("S-DTR-6: GET detail returns the record with AI fields and provenance for the owning org", async () => {
      const userA = await createAuthenticatedUser("dtr-get-detail");
      const { trustRecordId, assetId } = await uploadAndWaitForAnalysis(
        userA.accessToken,
        "S-DTR-6",
      );

      const getRes = await request(app.getHttpServer())
        .get(`/trust-records/${trustRecordId}`)
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(trustRecordId);
      expect(getRes.body.assetId).toBe(assetId);
      expect(getRes.body.state).toBe("DRAFT");
      expect(typeof getRes.body.aiSummary).toBe("string");
      expect(getRes.body.aiProvider).toBeTruthy();
      expect(getRes.body.anchor).toBeNull();
      expect(getRes.body.analysisFailureReason).toBeNull();
    });

    it("S-DTR-7: GET detail returns 404, not 403, for a cross-org request", async () => {
      const userA = await createAuthenticatedUser("dtr-get-cross-org-a");
      const userB = await createAuthenticatedUser("dtr-get-cross-org-b");
      const { trustRecordId } = await uploadAndWaitForAnalysis(userA.accessToken, "S-DTR-7");

      const getRes = await request(app.getHttpServer())
        .get(`/trust-records/${trustRecordId}`)
        .set("Authorization", `Bearer ${userB.accessToken}`)
        .send();
      expect(getRes.status).toBe(404);
    });

    it("S-DTR-8: GET detail surfaces the analyze-document failure reason (analysis-failure visibility)", async () => {
      const userA = await createAuthenticatedUser("dtr-get-analysis-failed");

      // Empty content stream -> unpdf.adapter's NoTextLayerError -> the
      // real analyze-document job fails visibly (ai-document-analysis
      // spec: "Explicit No-Text-Layer Failure").
      const pdfBytes = buildMinimalPdf("");
      const uploadRes = await request(app.getHttpServer())
        .post("/assets")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .attach("file", pdfBytes, { filename: "no-text.pdf", contentType: "application/pdf" });
      expect(uploadRes.status).toBe(201);
      const { trustRecordId } = uploadRes.body as { trustRecordId: string };

      const deadline = Date.now() + 15_000;
      let reason: string | null = null;
      while (Date.now() < deadline) {
        const getRes = await request(app.getHttpServer())
          .get(`/trust-records/${trustRecordId}`)
          .set("Authorization", `Bearer ${userA.accessToken}`)
          .send();
        if (getRes.body.analysisFailureReason) {
          reason = getRes.body.analysisFailureReason as string;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      expect(reason).toContain("no extractable text layer");

      const record = await prisma.trustRecord.findUnique({ where: { id: trustRecordId } });
      expect(record?.state).toBe("DRAFT");
      expect(record?.aiSummary).toBeNull();
    });
  },
);
