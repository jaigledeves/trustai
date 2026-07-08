import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
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

// D7: real Postgres + MinIO required (asset-ingestion writes both a DB row
// and an encrypted S3 object) — skipped gracefully when either isn't
// reachable, mirroring auth.e2e-spec.ts / storage.e2e-spec.ts.
describe.skipIf(!dbAvailable || !storageAvailable)(
  "Assets E2E (asset-ingestion capability)",
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    const sentEmails = new Map<string, string>();

    function uniqueEmail(label: string): string {
      return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    }

    /** Registers, verifies, and logs in a fresh org admin; returns the JWT + orgId. */
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

    it("S-ASSET-1: upload creates a DigitalAsset (READY) and a DRAFT TrustRecord", async () => {
      const userA = await createAuthenticatedUser("asset-upload-a");
      const pdfBytes = Buffer.from(`%PDF-1.4 upload test ${Date.now()}`);

      const response = await request(app.getHttpServer())
        .post("/assets")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .attach("file", pdfBytes, { filename: "contract.pdf", contentType: "application/pdf" });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ duplicate: false });
      expect(typeof response.body.assetId).toBe("string");
      expect(typeof response.body.trustRecordId).toBe("string");

      const assetRow = await prisma.digitalAsset.findUnique({
        where: { id: response.body.assetId },
      });
      expect(assetRow?.status).toBe("READY");
      expect(assetRow?.organizationId).toBe(userA.organizationId);

      const trustRecordRow = await prisma.trustRecord.findUnique({
        where: { id: response.body.trustRecordId },
      });
      expect(trustRecordRow?.state).toBe("DRAFT");
      expect(trustRecordRow?.assetId).toBe(response.body.assetId);
      expect(trustRecordRow?.schemaVersion).toBe("dtr-1");
    });

    it("S-ASSET-2: non-PDF upload is rejected with 400", async () => {
      const userA = await createAuthenticatedUser("asset-non-pdf");

      const response = await request(app.getHttpServer())
        .post("/assets")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .attach("file", Buffer.from("not a pdf"), {
          filename: "notes.txt",
          contentType: "text/plain",
        });

      expect(response.status).toBe(400);
    });

    it("S-ASSET-3: upload without a token is rejected with 401", async () => {
      const response = await request(app.getHttpServer())
        .post("/assets")
        .attach("file", Buffer.from("%PDF-1.4 no auth"), {
          filename: "contract.pdf",
          contentType: "application/pdf",
        });

      expect(response.status).toBe(401);
    });

    it("S-ASSET-4: cross-org access to GET /assets/:id returns 404, not 403", async () => {
      const userA = await createAuthenticatedUser("asset-cross-org-a");
      const userB = await createAuthenticatedUser("asset-cross-org-b");
      const pdfBytes = Buffer.from(`%PDF-1.4 cross-org test ${Date.now()}`);

      const uploadRes = await request(app.getHttpServer())
        .post("/assets")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .attach("file", pdfBytes, { filename: "contract.pdf", contentType: "application/pdf" });
      const assetId = uploadRes.body.assetId as string;

      const ownerRes = await request(app.getHttpServer())
        .get(`/assets/${assetId}`)
        .set("Authorization", `Bearer ${userA.accessToken}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.id).toBe(assetId);

      const crossOrgRes = await request(app.getHttpServer())
        .get(`/assets/${assetId}`)
        .set("Authorization", `Bearer ${userB.accessToken}`);
      expect(crossOrgRes.status).toBe(404);
    });

    it("S-ASSET-5: same-org duplicate upload returns the existing DTR instead of creating a new one (RF-012)", async () => {
      const userA = await createAuthenticatedUser("asset-dedup-same-org");
      const pdfBytes = Buffer.from(`%PDF-1.4 dedup test ${Date.now()}`);

      const firstRes = await request(app.getHttpServer())
        .post("/assets")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .attach("file", pdfBytes, { filename: "contract.pdf", contentType: "application/pdf" });
      expect(firstRes.body.duplicate).toBe(false);

      const secondRes = await request(app.getHttpServer())
        .post("/assets")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .attach("file", pdfBytes, { filename: "contract.pdf", contentType: "application/pdf" });

      expect(secondRes.status).toBe(201);
      expect(secondRes.body).toEqual({
        assetId: firstRes.body.assetId,
        trustRecordId: firstRes.body.trustRecordId,
        duplicate: true,
      });

      const assetCount = await prisma.digitalAsset.count({
        where: { id: firstRes.body.assetId },
      });
      expect(assetCount).toBe(1);
    });

    it("S-ASSET-6: same hash across different orgs creates independent assets, not a duplicate", async () => {
      const userA = await createAuthenticatedUser("asset-dedup-cross-org-a");
      const userB = await createAuthenticatedUser("asset-dedup-cross-org-b");
      const pdfBytes = Buffer.from(`%PDF-1.4 shared-hash test ${Date.now()}`);

      const resA = await request(app.getHttpServer())
        .post("/assets")
        .set("Authorization", `Bearer ${userA.accessToken}`)
        .attach("file", pdfBytes, { filename: "contract.pdf", contentType: "application/pdf" });

      const resB = await request(app.getHttpServer())
        .post("/assets")
        .set("Authorization", `Bearer ${userB.accessToken}`)
        .attach("file", pdfBytes, { filename: "contract.pdf", contentType: "application/pdf" });

      expect(resA.body.duplicate).toBe(false);
      expect(resB.body.duplicate).toBe(false);
      expect(resB.body.assetId).not.toBe(resA.body.assetId);

      const assetA = await prisma.digitalAsset.findUnique({ where: { id: resA.body.assetId } });
      const assetB = await prisma.digitalAsset.findUnique({ where: { id: resB.body.assetId } });
      expect(assetA?.sha256).toBe(assetB?.sha256);
      expect(assetA?.organizationId).not.toBe(assetB?.organizationId);
    });
  },
);
