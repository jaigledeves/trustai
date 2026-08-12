import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { sha256Hex, verifyAssetAgainstRecord } from "@trustai/dtr-core";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ANCHOR_REGISTRY_ABI } from "../src/adapters/chain/anchor-registry.abi";
import { PrismaService } from "../src/adapters/prisma/prisma.service";
import { NOTIFICATION_PORT } from "../src/ports/notification.port";
import {
  anchorRegistryArtifactExists,
  readAnchorRegistryArtifact,
} from "./utils/anchor-registry-artifact";
import { ANVIL_RPC_URL, isAnvilAvailable } from "./utils/anvil-availability";
import { isDatabaseAvailable } from "./utils/db-availability";
import { isStorageAvailable } from "./utils/storage-availability";

const [dbAvailable, storageAvailable, anvilAvailable, artifactExists] = await Promise.all([
  isDatabaseAvailable(),
  isStorageAvailable(),
  isAnvilAvailable(),
  Promise.resolve(anchorRegistryArtifactExists()),
]);

// public-verification design.md "Feature flag" decision: read at
// module-eval time (app.module.ts), BEFORE Nest's DI container exists —
// so it must already be "true" when app.module.ts is first evaluated. A
// dynamic import AFTER setting process.env (rather than a static
// top-of-file import) guarantees that ordering within this file,
// regardless of what any other e2e file or shell env has set.
process.env["PUBLIC_VERIFICATION_ENABLED"] = "true";
const { AppModule } = await import("../src/app.module");

// Same well-known anvil default account #0 as anchor-chain.e2e-spec.ts /
// certification-flow.e2e-spec.ts — public knowledge, only ever funds
// ephemeral local anvil instances.
const ANVIL_DEFAULT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const ANVIL_CHAIN_ID = 31337;

/** Same hand-crafted minimal single-page text-layer PDF technique as certification-flow.e2e-spec.ts. */
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

/** Flips one byte in the middle of the buffer — guaranteed to change its SHA-256 (spec: "One byte changed"). */
function tamperOneByte(buffer: Buffer): Buffer {
  const tampered = Buffer.from(buffer);
  const idx = Math.floor(tampered.length / 2);
  tampered[idx] = (tampered[idx]! + 1) % 256;
  return tampered;
}

/** Forces anvil to mine one extra block (INV-32 requires 2 confirmations; anvil auto-mines only 1 per tx). */
async function mineExtraBlock(): Promise<void> {
  await fetch(ANVIL_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "evm_mine", params: [] }),
  });
}

/**
 * public-verification (UC-02) e2e — real DB + real local anvil chain
 * (same constraint as anchor-chain/certification-flow e2e: no funded Base
 * Sepolia wallet/RPC in this sandbox). Covers every scenario in spec #247:
 * VALID/ASSET_MISMATCH/PENDING_ANCHOR/INVALID_RECORD verdicts, the GET-404
 * vs POST-200 unknown-id asymmetry, attempt persistence (RF-046), 429
 * throttling, and the RPC-failure-falls-back-to-DB scenario. Gated on
 * DB+MinIO+anvil+contract-artifact, skipped gracefully otherwise.
 */
describe.skipIf(!dbAvailable || !storageAvailable || !anvilAvailable || !artifactExists)(
  "Public Verification E2E (real anvil chain)",
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let contractAddress: Address;
    let publicClient: ReturnType<typeof createPublicClient>;
    const sentEmails = new Map<string, string>();
    const originalEnv: Record<string, string | undefined> = {};

    const CHAIN_ENV_KEYS = [
      "CHAIN_RPC_URL",
      "ANCHOR_CONTRACT_ADDRESS",
      "WORKER_WALLET_PRIVATE_KEY",
      "CHAIN_ID",
      "CONFIRM_ANCHOR_POLL_INTERVAL_SECONDS",
    ] as const;

    function uniqueEmail(label: string): string {
      return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    }

    async function createAuthenticatedUser(label: string): Promise<{ accessToken: string }> {
      const email = uniqueEmail(label);
      const password = "Password123";

      await request(app.getHttpServer()).post("/auth/register").send({ email, password });
      const rawToken = sentEmails.get(email);
      await request(app.getHttpServer()).get(`/auth/verify-email?token=${rawToken}`);
      const loginRes = await request(app.getHttpServer()).post("/auth/login").send({ email, password });

      return { accessToken: loginRes.body.accessToken as string };
    }

    /** Uploads the given PDF bytes and polls the trust-records detail endpoint until AI analysis lands. */
    async function uploadAndWaitForAnalysis(accessToken: string, label: string, pdfBytes: Buffer): Promise<string> {
      const uploadRes = await request(app.getHttpServer())
        .post("/assets")
        .set("Authorization", `Bearer ${accessToken}`)
        .attach("file", pdfBytes, { filename: `${label}.pdf`, contentType: "application/pdf" });
      expect(uploadRes.status).toBe(201);
      const { trustRecordId } = uploadRes.body as { trustRecordId: string };

      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        const getRes = await request(app.getHttpServer())
          .get(`/trust-records/${trustRecordId}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send();
        if (getRes.body.aiSummary) {
          return trustRecordId;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error(`Timed out waiting for analyze-document for ${trustRecordId}`);
    }

    async function waitForState(
      accessToken: string,
      trustRecordId: string,
      state: string,
      timeoutMs: number,
    ): Promise<Record<string, unknown>> {
      const deadline = Date.now() + timeoutMs;
      let last: Record<string, unknown> = {};
      while (Date.now() < deadline) {
        const res = await request(app.getHttpServer())
          .get(`/trust-records/${trustRecordId}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send();
        last = res.body as Record<string, unknown>;
        if (last["state"] === state) {
          return last;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      throw new Error(`Timed out waiting for TrustRecord ${trustRecordId} to reach ${state}`);
    }

    async function waitForAnchorTxSubmitted(accessToken: string, id: string): Promise<void> {
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        const res = await request(app.getHttpServer())
          .get(`/trust-records/${id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send();
        const anchor = res.body.anchor as Record<string, unknown> | null;
        if (anchor?.["txHash"]) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error(`Timed out waiting for anchor-dtr to submit a tx for ${id}`);
    }

    /** Full upload -> analyze -> confirm -> anchor -> CERTIFIED flow, returns the resulting trustRecordId. */
    async function certifyNewRecord(label: string, pdfBytes: Buffer): Promise<string> {
      const user = await createAuthenticatedUser(label);
      const trustRecordId = await uploadAndWaitForAnalysis(user.accessToken, label, pdfBytes);

      const confirmRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/confirm`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send();
      expect(confirmRes.status).toBe(201);

      const anchorRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/anchor`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send();
      expect(anchorRes.status).toBe(201);

      await waitForAnchorTxSubmitted(user.accessToken, trustRecordId);
      await mineExtraBlock();
      await waitForState(user.accessToken, trustRecordId, "CERTIFIED", 30_000);

      return trustRecordId;
    }

    /** Upload -> analyze -> confirm only (READY, deliberately never anchored) — for the PENDING_ANCHOR scenario. */
    async function confirmWithoutAnchoring(label: string, pdfBytes: Buffer): Promise<string> {
      const user = await createAuthenticatedUser(label);
      const trustRecordId = await uploadAndWaitForAnalysis(user.accessToken, label, pdfBytes);

      const confirmRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/confirm`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send();
      expect(confirmRes.status).toBe(201);

      return trustRecordId;
    }

    beforeAll(async () => {
      const chain: Chain = {
        id: ANVIL_CHAIN_ID,
        name: "anvil",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [ANVIL_RPC_URL] } },
      };
      const account = privateKeyToAccount(ANVIL_DEFAULT_PRIVATE_KEY);
      publicClient = createPublicClient({ chain, transport: http(ANVIL_RPC_URL) });
      const walletClient = createWalletClient({ account, chain, transport: http(ANVIL_RPC_URL) });

      const { abi, bytecode } = readAnchorRegistryArtifact();
      const deployTxHash = await walletClient.deployContract({ abi, bytecode, args: [] });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
      if (!receipt.contractAddress) {
        throw new Error("AnchorRegistry deployment to anvil did not return a contract address");
      }
      contractAddress = receipt.contractAddress;

      for (const key of CHAIN_ENV_KEYS) {
        originalEnv[key] = process.env[key];
      }
      process.env["CHAIN_RPC_URL"] = ANVIL_RPC_URL;
      process.env["ANCHOR_CONTRACT_ADDRESS"] = contractAddress;
      process.env["WORKER_WALLET_PRIVATE_KEY"] = ANVIL_DEFAULT_PRIVATE_KEY;
      process.env["CHAIN_ID"] = String(ANVIL_CHAIN_ID);
      process.env["CONFIRM_ANCHOR_POLL_INTERVAL_SECONDS"] = "1";

      const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
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
    }, 30_000);

    afterAll(async () => {
      await app?.close();
      for (const key of CHAIN_ENV_KEYS) {
        if (originalEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalEnv[key];
        }
      }
      delete process.env["PUBLIC_VERIFICATION_ENABLED"];
    });

    it("S-PV-1: GET/POST reach VALID with a real confirmed on-chain anchor; logs HASH_ONLY+FULL attempts", async () => {
      const pdfBytes = buildMinimalPdf("BT /F1 24 Tf 50 100 Td (PV-VALID) Tj ET");
      const trustRecordId = await certifyNewRecord("pv-valid", pdfBytes);

      const getRes = await request(app.getHttpServer()).get(`/public/verify/${trustRecordId}`).send();
      expect(getRes.status).toBe(200);
      expect(getRes.body.verdict).toBe("VALID");
      expect(getRes.body.documentIntegrity).toBe(true);
      expect(getRes.body.chainAnchor.anchored).toBe(true);
      expect(getRes.body.chainAnchor.txHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(getRes.body.chainAnchor.explorerUrl).toContain(getRes.body.chainAnchor.txHash);
      expect(getRes.body.chainAnchor.chainReadUnavailable).toBe(false);
      // INV-41: the hash-only DTO has NO analysis key at all, not even null.
      expect(getRes.body).not.toHaveProperty("analysis");
      expect(getRes.body.disclaimer).toEqual(expect.any(String));

      const postRes = await request(app.getHttpServer())
        .post(`/public/verify/${trustRecordId}`)
        .query({ channel: "QR" })
        .attach("file", pdfBytes, { filename: "doc.pdf", contentType: "application/pdf" });
      expect(postRes.status).toBe(200);
      expect(postRes.body.verdict).toBe("VALID");
      expect(postRes.body.analysis).toBeTruthy();
      expect(postRes.body.analysis.summary).toEqual(expect.any(String));
      expect(postRes.body.chainAnchor.anchored).toBe(true);

      const attempts = await prisma.verificationAttempt.findMany({ where: { trustRecordId } });
      expect(attempts.some((a) => a.type === "HASH_ONLY" && a.verdict === "VALID")).toBe(true);
      expect(
        attempts.some((a) => a.type === "FULL" && a.verdict === "VALID" && a.channel === "QR"),
      ).toBe(true);
    }, 30_000);

    it("S-PV-2: one-byte-tampered upload -> ASSET_MISMATCH, analysis withheld, attempt logged", async () => {
      const pdfBytes = buildMinimalPdf("BT /F1 24 Tf 50 100 Td (PV-MISMATCH) Tj ET");
      const trustRecordId = await certifyNewRecord("pv-mismatch", pdfBytes);

      const postRes = await request(app.getHttpServer())
        .post(`/public/verify/${trustRecordId}`)
        .attach("file", tamperOneByte(pdfBytes), { filename: "tampered.pdf", contentType: "application/pdf" });

      expect(postRes.status).toBe(200);
      expect(postRes.body.verdict).toBe("ASSET_MISMATCH");
      expect(postRes.body.documentIntegrity).toBe(false);
      expect(postRes.body.analysis).toBeNull();

      const attempts = await prisma.verificationAttempt.findMany({ where: { trustRecordId } });
      expect(
        attempts.some((a) => a.type === "FULL" && a.verdict === "ASSET_MISMATCH"),
      ).toBe(true);
    }, 30_000);

    it("S-PV-3: matching hash, not yet anchored (READY) -> PENDING_ANCHOR with analysis, no chain data confirmed", async () => {
      const pdfBytes = buildMinimalPdf("BT /F1 24 Tf 50 100 Td (PV-PENDING) Tj ET");
      const trustRecordId = await confirmWithoutAnchoring("pv-pending", pdfBytes);

      const getRes = await request(app.getHttpServer()).get(`/public/verify/${trustRecordId}`).send();
      expect(getRes.status).toBe(200);
      expect(getRes.body.verdict).toBe("PENDING_ANCHOR");
      expect(getRes.body.chainAnchor.anchored).toBe(false);

      const postRes = await request(app.getHttpServer())
        .post(`/public/verify/${trustRecordId}`)
        .attach("file", pdfBytes, { filename: "doc.pdf", contentType: "application/pdf" });
      expect(postRes.status).toBe(200);
      expect(postRes.body.verdict).toBe("PENDING_ANCHOR");
      expect(postRes.body.analysis).toBeTruthy();
      expect(postRes.body.chainAnchor.anchored).toBe(false);

      const attempts = await prisma.verificationAttempt.findMany({ where: { trustRecordId } });
      expect(attempts.some((a) => a.type === "HASH_ONLY" && a.verdict === "PENDING_ANCHOR")).toBe(true);
      expect(attempts.some((a) => a.type === "FULL" && a.verdict === "PENDING_ANCHOR")).toBe(true);
    }, 30_000);

    it("S-PV-4: unknown id -> GET 404, POST 200 INVALID_RECORD, no attempt rows persisted", async () => {
      const unknownId = "00000000-0000-0000-0000-000000000000";

      const getRes = await request(app.getHttpServer()).get(`/public/verify/${unknownId}`).send();
      expect(getRes.status).toBe(404);

      const postRes = await request(app.getHttpServer())
        .post(`/public/verify/${unknownId}`)
        .attach("file", Buffer.from("anything"), { filename: "doc.pdf", contentType: "application/pdf" });
      expect(postRes.status).toBe(200);
      expect(postRes.body.verdict).toBe("INVALID_RECORD");
      expect(postRes.body.analysis).toBeNull();

      const attempts = await prisma.verificationAttempt.findMany({ where: { trustRecordId: unknownId } });
      expect(attempts).toHaveLength(0);
    });

    it("S-PV-5: on-chain read failure falls back to DB Anchor.status, chainReadUnavailable=true, never 5xx", async () => {
      const pdfBytes = buildMinimalPdf("BT /F1 24 Tf 50 100 Td (PV-FALLBACK) Tj ET");
      const trustRecordId = await certifyNewRecord("pv-fallback", pdfBytes);

      // Unreachable RPC target — nothing listens on this port. Captured
      // into a SEPARATE app instance's ViemAnchorAdapter at compile time;
      // restoring the env var immediately after does NOT retroactively
      // affect the already-constructed adapter (the URL is baked into its
      // publicClient), and does not affect the main `app` (already
      // compiled with the good anvil URL, earlier in `beforeAll`).
      const previousRpcUrl = process.env["CHAIN_RPC_URL"];
      process.env["CHAIN_RPC_URL"] = "http://127.0.0.1:1";
      let fallbackApp: INestApplication | undefined;
      try {
        const fallbackModuleRef = await Test.createTestingModule({ imports: [AppModule] })
          .overrideProvider(NOTIFICATION_PORT)
          .useValue({ sendVerificationEmail: vi.fn() })
          .compile();
        fallbackApp = fallbackModuleRef.createNestApplication();
        await fallbackApp.init();
      } finally {
        process.env["CHAIN_RPC_URL"] = previousRpcUrl;
      }

      try {
        const res = await request(fallbackApp!.getHttpServer())
          .get(`/public/verify/${trustRecordId}`)
          .send();

        expect(res.status).toBe(200);
        expect(res.body.verdict).toBe("VALID");
        expect(res.body.chainAnchor.chainReadUnavailable).toBe(true);
        // DB Anchor.status is CONFIRMED (persisted earlier by certifyNewRecord against the real anvil app).
        expect(res.body.chainAnchor.anchored).toBe(true);
      } finally {
        await fallbackApp?.close();
      }
    }, 30_000);

    it(
      "S-PV-6: CRITICAL — independent reproducibility: a dtr-core hash computed OUTSIDE the app, " +
        "plus a raw chain read bypassing AnchorPort, agree with the app's own VALID verdict " +
        "(spec #247 'Verdict matches independent recomputation')",
      async () => {
        const pdfBytes = buildMinimalPdf("BT /F1 24 Tf 50 100 Td (PV-REPRO) Tj ET");
        const trustRecordId = await certifyNewRecord("pv-repro", pdfBytes);

        // ── Independent path: bypasses VerifyDocumentUseCase AND AnchorPort
        // entirely. Reads the certified fields straight from Postgres (the
        // same fields any verifier holding a legitimately-issued DTR would
        // have — publishing that DTR JSON to a verifier is UC-05, out of
        // scope here; what's under test is whether the ALGORITHM + ON-CHAIN
        // STATE are independently reproducible, not the transport). Rebuilds
        // the TrustRecordV1 candidate and calls dtr-core's OWN exported
        // `verifyAssetAgainstRecord`/`sha256Hex` — the exact same public
        // functions any third-party verifier (or the CLI in
        // smart-contracts/README.md) would call — never TrustAI's own
        // `VerifyDocumentUseCase` code.
        const dbRecord = await prisma.trustRecord.findUniqueOrThrow({
          where: { id: trustRecordId },
          include: { asset: true },
        });
        const independentCandidate = {
          schemaVersion: dbRecord.schemaVersion,
          asset: {
            sha256: dbRecord.asset.sha256,
            mimeType: dbRecord.asset.mimeType,
            sizeBytes: dbRecord.asset.sizeBytes,
            ...(dbRecord.asset.filename ? { filename: dbRecord.asset.filename } : {}),
          },
          analysis: {
            summary: dbRecord.aiSummary,
            classification: dbRecord.aiClassification,
            language: dbRecord.aiLanguage,
          },
          provenance: {
            provider: dbRecord.aiProvider,
            model: dbRecord.aiModel,
            modelVersion: dbRecord.aiModelVersion,
            promptVersion: dbRecord.aiPromptVersion,
            taxonomyVersion: dbRecord.aiTaxonomyVersion,
            analyzedAt: dbRecord.aiAnalyzedAt?.toISOString(),
          },
          issuedAt: dbRecord.issuedAt?.toISOString(),
        };
        const independentUploadSha256 = await sha256Hex(pdfBytes);
        const verification = await verifyAssetAgainstRecord(independentCandidate, independentUploadSha256);
        expect(verification.status).toBe("asset_verified");
        if (verification.status !== "asset_verified") {
          throw new Error("unreachable — asserted above");
        }
        const independentCanonicalHash = verification.canonicalHash;

        // The app's OWN stored canonicalHash (computed at confirm time by
        // ConfirmReviewUseCase) equals what this test independently derived —
        // proof the hashing algorithm itself is reproducible, not a
        // TrustAI-only secret computation.
        expect(dbRecord.canonicalHash).toBe(independentCanonicalHash);

        // Raw chain read — a plain viem PublicClient call directly against
        // AnchorRegistry, NOT AnchorPort/ViemAnchorAdapter/the use case.
        const isAnchoredOnChain = await publicClient.readContract({
          address: contractAddress,
          abi: ANCHOR_REGISTRY_ABI,
          functionName: "isAnchored",
          args: [`0x${independentCanonicalHash}` as `0x${string}`],
        });
        expect(isAnchoredOnChain).toBe(true);

        // Compare to the app's own verdict through the real HTTP endpoint —
        // two independently-arrived-at conclusions, same answer.
        const postRes = await request(app.getHttpServer())
          .post(`/public/verify/${trustRecordId}`)
          .attach("file", pdfBytes, { filename: "doc.pdf", contentType: "application/pdf" });
        expect(postRes.status).toBe(200);
        expect(postRes.body.verdict).toBe("VALID");
        expect(postRes.body.chainAnchor.anchored).toBe(true);
      },
      30_000,
    );

    // Runs after S-PV-6 (which adds one POST call) and before the GET
    // throttle test — deliberately exhausts the shared `app`'s POST
    // throttle bucket for this IP/route. Whatever budget remains from
    // earlier tests, 21 more calls guarantees the 429 triggers by the 21st
    // at the latest (spec: "Excess POST requests are throttled").
    it("S-PV-7: 21st POST within the 60s window is throttled (429)", async () => {
      let lastStatus = 0;
      for (let i = 0; i < 21; i++) {
        const res = await request(app.getHttpServer())
          .post("/public/verify/throttle-probe-id")
          .attach("file", Buffer.from("probe"), { filename: "probe.pdf", contentType: "application/pdf" });
        lastStatus = res.status;
      }
      expect(lastStatus).toBe(429);
    }, 30_000);

    // Runs LAST — GET has its own separate throttle bucket (60/min) from
    // POST's (20/min), so ordering relative to S-PV-7 doesn't matter for
    // correctness, but keeping both throttle-exhaustion tests together and
    // last avoids any risk of starving earlier GET-based assertions.
    it("S-PV-8: 61st GET within the 60s window is throttled (429)", async () => {
      let lastStatus = 0;
      for (let i = 0; i < 61; i++) {
        const res = await request(app.getHttpServer()).get("/public/verify/throttle-probe-id").send();
        lastStatus = res.status;
      }
      expect(lastStatus).toBe(429);
    }, 30_000);

    // ADR-012 / spec "Public Verification Limits Remain Unchanged": proves
    // public-verification's per-route @Throttle({ global: {...} }) overrides
    // (60/20) always win over the global default THROTTLE_LIMIT. Uses its OWN
    // app instance with THROTTLE_LIMIT=1 — far below public-verification's own
    // 60/20 — so if the per-route overrides weren't applied (or were wrong),
    // the 2nd call on either route would 429 immediately. The record id
    // doesn't need to exist — GET 404s / POST 200s INVALID_RECORD either
    // way; only the ABSENCE of 429 is under test here.
    it("S-PV-9: public-verification keeps its own 60/20 limits (per-route override) even when THROTTLE_LIMIT is set far below them", async () => {
      const previousGlobalLimit = process.env["THROTTLE_LIMIT"];
      const previousGlobalTtl = process.env["THROTTLE_TTL_SECONDS"];
      process.env["THROTTLE_LIMIT"] = "1";
      process.env["THROTTLE_TTL_SECONDS"] = "60";

      let exemptApp: INestApplication | undefined;
      try {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
          .overrideProvider(NOTIFICATION_PORT)
          .useValue({ sendVerificationEmail: vi.fn() })
          .compile();
        exemptApp = moduleRef.createNestApplication();
        await exemptApp.init();

        for (let i = 0; i < 3; i++) {
          const getRes = await request(exemptApp.getHttpServer())
            .get("/public/verify/global-guard-exemption-probe")
            .send();
          expect(getRes.status).not.toBe(429);
        }

        for (let i = 0; i < 3; i++) {
          const postRes = await request(exemptApp.getHttpServer())
            .post("/public/verify/global-guard-exemption-probe")
            .attach("file", Buffer.from("probe"), {
              filename: "probe.pdf",
              contentType: "application/pdf",
            });
          expect(postRes.status).not.toBe(429);
        }
      } finally {
        await exemptApp?.close();
        if (previousGlobalLimit === undefined) {
          delete process.env["THROTTLE_LIMIT"];
        } else {
          process.env["THROTTLE_LIMIT"] = previousGlobalLimit;
        }
        if (previousGlobalTtl === undefined) {
          delete process.env["THROTTLE_TTL_SECONDS"];
        } else {
          process.env["THROTTLE_TTL_SECONDS"] = previousGlobalTtl;
        }
      }
    }, 30_000);
  },
);
