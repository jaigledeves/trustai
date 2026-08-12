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

    /**
     * Uploads a real PDF WITHOUT waiting for the analyze-document job —
     * the list endpoint (S-DTR-9/10/11) only needs id/state/filename/
     * createdAt, so waiting up to 15s per record here would make
     * multi-record pagination tests unnecessarily slow.
     */
    async function uploadAsset(
      accessToken: string,
      label: string,
    ): Promise<{ assetId: string; trustRecordId: string }> {
      const pdfBytes = buildMinimalPdf(`BT /F1 24 Tf 50 100 Td (${label}) Tj ET`);
      const uploadRes = await request(app.getHttpServer())
        .post("/assets")
        .set("Authorization", `Bearer ${accessToken}`)
        .attach("file", pdfBytes, { filename: `${label}.pdf`, contentType: "application/pdf" });
      expect(uploadRes.status).toBe(201);
      return uploadRes.body as { assetId: string; trustRecordId: string };
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

    it("S-DTR-9: GET list is org-scoped (RNF-004) — org A never sees org B's records", async () => {
      const userA = await createAuthenticatedUser("dtr-list-org-a");
      const userB = await createAuthenticatedUser("dtr-list-org-b");
      const { trustRecordId: recordA1 } = await uploadAsset(userA.accessToken, "S-DTR-9-a1");
      const { trustRecordId: recordA2 } = await uploadAsset(userA.accessToken, "S-DTR-9-a2");
      const { trustRecordId: recordB1 } = await uploadAsset(userB.accessToken, "S-DTR-9-b1");

      const listA = await request(app.getHttpServer())
        .get("/trust-records")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(listA.status).toBe(200);
      expect(listA.body.total).toBe(2);
      const idsA = (listA.body.items as Array<{ id: string }>).map((item) => item.id);
      expect(idsA).toEqual(expect.arrayContaining([recordA1, recordA2]));
      expect(idsA).not.toContain(recordB1);

      const listB = await request(app.getHttpServer())
        .get("/trust-records")
        .set("Authorization", `Bearer ${userB.accessToken}`)
        .send();
      expect(listB.status).toBe(200);
      expect(listB.body.total).toBe(1);
      expect((listB.body.items as Array<{ id: string }>).map((item) => item.id)).toEqual([
        recordB1,
      ]);
    });

    it("S-DTR-10: GET list on an org with zero trust records returns {items: [], total: 0}, never a 404", async () => {
      const userA = await createAuthenticatedUser("dtr-list-empty-org");

      const listRes = await request(app.getHttpServer())
        .get("/trust-records")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();

      expect(listRes.status).toBe(200);
      expect(listRes.body).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
    });

    it("S-DTR-11: GET list paginates correctly and caps pageSize at 100", async () => {
      const userA = await createAuthenticatedUser("dtr-list-pagination");
      await uploadAsset(userA.accessToken, "S-DTR-11-1");
      await uploadAsset(userA.accessToken, "S-DTR-11-2");
      await uploadAsset(userA.accessToken, "S-DTR-11-3");

      const pageOne = await request(app.getHttpServer())
        .get("/trust-records?page=1&pageSize=2")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(pageOne.status).toBe(200);
      expect(pageOne.body.total).toBe(3);
      expect(pageOne.body.items).toHaveLength(2);
      expect(pageOne.body.page).toBe(1);
      expect(pageOne.body.pageSize).toBe(2);

      const pageTwo = await request(app.getHttpServer())
        .get("/trust-records?page=2&pageSize=2")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(pageTwo.status).toBe(200);
      expect(pageTwo.body.total).toBe(3);
      expect(pageTwo.body.items).toHaveLength(1);

      const overCapped = await request(app.getHttpServer())
        .get("/trust-records?pageSize=500")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(overCapped.status).toBe(200);
      expect(overCapped.body.pageSize).toBe(100);
    });

    it("S-DTR-12: state filter returns only matching records (query-level, filtered total)", async () => {
      const userA = await createAuthenticatedUser("dtr-list-state-filter");
      await uploadAsset(userA.accessToken, "S-DTR-12-1");
      await uploadAsset(userA.accessToken, "S-DTR-12-2");

      // Freshly uploaded records are DRAFT — filtering by CERTIFIED must
      // return zero even though the unfiltered list has two.
      const draftList = await request(app.getHttpServer())
        .get("/trust-records?state=DRAFT")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(draftList.status).toBe(200);
      expect(draftList.body.total).toBe(2);

      const certifiedList = await request(app.getHttpServer())
        .get("/trust-records?state=CERTIFIED")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();
      expect(certifiedList.status).toBe(200);
      expect(certifiedList.body).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
    });

    it("S-DTR-13: filename search is case-insensitive and narrows the result set", async () => {
      const userA = await createAuthenticatedUser("dtr-list-search");
      const { trustRecordId: contrato } = await uploadAsset(userA.accessToken, "Contrato-Alpha");
      await uploadAsset(userA.accessToken, "Factura-Beta");

      const res = await request(app.getHttpServer())
        // lowercase query against a mixed-case "Contrato-Alpha.pdf" filename
        .get("/trust-records?search=contrato-alpha")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect((res.body.items as Array<{ id: string }>).map((i) => i.id)).toEqual([contrato]);
    });

    it("S-DTR-14: a bogus state value is rejected with 400 (ADR-008), never a 500", async () => {
      const userA = await createAuthenticatedUser("dtr-list-bad-state");

      const res = await request(app.getHttpServer())
        .get("/trust-records?state=BOGUS")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();

      expect(res.status).toBe(400);
    });

    it("S-DTR-15: search never leaks across organizations (RNF-004)", async () => {
      const userA = await createAuthenticatedUser("dtr-list-search-org-a");
      const userB = await createAuthenticatedUser("dtr-list-search-org-b");
      const { trustRecordId: secretoA } = await uploadAsset(userA.accessToken, "Secreto-Alpha");
      await uploadAsset(userB.accessToken, "Secreto-Bravo");

      const res = await request(app.getHttpServer())
        .get("/trust-records?search=secreto")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect((res.body.items as Array<{ id: string }>).map((i) => i.id)).toEqual([secretoA]);
    });

    it("S-DTR-16: a search with no match returns an empty page, not a 404", async () => {
      const userA = await createAuthenticatedUser("dtr-list-no-match");
      await uploadAsset(userA.accessToken, "S-DTR-16-doc");

      const res = await request(app.getHttpServer())
        .get("/trust-records?search=zzz-nonexistent")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
    });

    // ADR-012 / spec "Global Default Throttle Coverage": GET /trust-records
    // carries no per-route @Throttle override, so it falls back to the
    // global default. Uses its OWN app instance with a tiny
    // THROTTLE_LIMIT/THROTTLE_TTL_SECONDS (rather than the shared 100/60s
    // default) so this test stays fast without waiting out a real window.
    // Passes explicit ?page/?pageSize: this endpoint has a pre-existing,
    // unrelated bug (empty query -> NaN pagination -> 500, untouched by this
    // change) that would otherwise mask the throttle assertion. The throttle
    // (a guard) runs before the handler regardless, so explicit params only
    // keep the successful requests at 200 without changing what's proven.
    it("S-DTR-17: a no-override route enforces the global default — within limit succeeds, exceeding it returns 429", async () => {
      const previousLimit = process.env["THROTTLE_LIMIT"];
      const previousTtl = process.env["THROTTLE_TTL_SECONDS"];
      process.env["THROTTLE_LIMIT"] = "3";
      process.env["THROTTLE_TTL_SECONDS"] = "60";

      const localSentEmails = new Map<string, string>();
      let throttledApp: INestApplication | undefined;
      try {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
          .overrideProvider(NOTIFICATION_PORT)
          .useValue({
            sendVerificationEmail: vi.fn(async (email: string, rawToken: string) => {
              localSentEmails.set(email, rawToken);
            }),
          })
          .compile();
        throttledApp = moduleRef.createNestApplication();
        await throttledApp.init();

        const email = `dtr-throttle-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
        const password = "Password123";
        await request(throttledApp.getHttpServer()).post("/auth/register").send({ email, password });
        const rawToken = localSentEmails.get(email);
        await request(throttledApp.getHttpServer()).get(`/auth/verify-email?token=${rawToken}`);
        const loginRes = await request(throttledApp.getHttpServer())
          .post("/auth/login")
          .send({ email, password });
        const accessToken = loginRes.body.accessToken as string;

        // 3 requests (== THROTTLE_LIMIT) within the window all succeed.
        for (let i = 0; i < 3; i++) {
          const res = await request(throttledApp.getHttpServer())
            .get("/trust-records?page=1&pageSize=20")
            .set("Authorization", `Bearer ${accessToken}`)
            .send();
          expect(res.status).toBe(200);
        }

        // The 4th request exceeds THROTTLE_LIMIT within THROTTLE_TTL_SECONDS.
        const overLimitRes = await request(throttledApp.getHttpServer())
          .get("/trust-records?page=1&pageSize=20")
          .set("Authorization", `Bearer ${accessToken}`)
          .send();
        expect(overLimitRes.status).toBe(429);
      } finally {
        await throttledApp?.close();
        if (previousLimit === undefined) {
          delete process.env["THROTTLE_LIMIT"];
        } else {
          process.env["THROTTLE_LIMIT"] = previousLimit;
        }
        if (previousTtl === undefined) {
          delete process.env["THROTTLE_TTL_SECONDS"];
        } else {
          process.env["THROTTLE_TTL_SECONDS"] = previousTtl;
        }
      }
    }, 30_000);

    // ADR-012 / spec "Moderate Throttle on Trust Record Anchoring":
    // ANCHOR_THROTTLE_LIMIT (default 10) is independent of the global
    // default. Repeating the SAME request 11 times is sufficient — the
    // throttle guard counts every request to this route+tracker
    // regardless of the handler's own response (first call succeeds
    // 201->ANCHORING; every call after that 409s, since the record is no
    // longer READY — irrelevant to the guard, which runs before the
    // handler either way).
    it("S-DTR-18: exceeding ANCHOR_THROTTLE_LIMIT on POST /trust-records/:id/anchor returns 429", async () => {
      const userA = await createAuthenticatedUser("dtr-anchor-throttle");
      const { trustRecordId } = await uploadAndWaitForAnalysis(userA.accessToken, "S-DTR-18");
      await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/confirm`)
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .send();

      let lastStatus = 0;
      for (let i = 0; i < 11; i++) {
        const res = await request(app.getHttpServer())
          .post(`/trust-records/${trustRecordId}/anchor`)
          .set("Authorization", `Bearer ${userA.accessToken}`)
          .send();
        lastStatus = res.status;
      }
      expect(lastStatus).toBe(429);
    }, 30_000);
  },
);
