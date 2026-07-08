import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
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
import { AppModule } from "../src/app.module";
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

// Same well-known anvil default account #0 as anchor-chain.e2e-spec.ts —
// public knowledge, only ever funds ephemeral local anvil instances.
const ANVIL_DEFAULT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const ANVIL_CHAIN_ID = 31337;

/** Same hand-crafted minimal single-page text-layer PDF technique as trust-records.e2e-spec.ts. */
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

/** Forces anvil to mine one extra block via a raw `evm_mine` RPC call — needed because anvil only auto-mines one block per submitted tx, and INV-32 requires 2 confirmations. */
async function mineExtraBlock(): Promise<void> {
  await fetch(ANVIL_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "evm_mine", params: [] }),
  });
}

/**
 * Full golden-path e2e (blockchain-anchoring + dtr-lifecycle capabilities),
 * Phase 7/PR7's capstone test: upload -> analyze -> review -> confirm ->
 * anchor -> confirm-anchor -> CERTIFIED, against a REAL local anvil node
 * (same constraint as anchor-chain.e2e-spec.ts — no funded Base Sepolia
 * wallet/RPC in this sandbox). Gated on DB+MinIO+anvil+contract-artifact,
 * same pattern as the other e2e suites.
 *
 * `WorkerModule`'s `ANCHOR_PORT` factory reads `CHAIN_RPC_URL`/
 * `ANCHOR_CONTRACT_ADDRESS`/`WORKER_WALLET_PRIVATE_KEY`/`CHAIN_ID` via
 * `ConfigService` ONCE, when the Nest module is compiled — so this suite
 * sets those `process.env` vars in `beforeAll`, BEFORE `Test.createTestingModule(...).compile()`,
 * and restores them in `afterAll` to avoid leaking into other e2e files
 * that might share a worker process.
 */
describe.skipIf(!dbAvailable || !storageAvailable || !anvilAvailable || !artifactExists)(
  "Certification Flow Golden Path E2E (real anvil chain)",
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let contractAddress: Address;
    let publicClient: ReturnType<typeof createPublicClient>;
    let walletClient: ReturnType<typeof createWalletClient>;
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

    /** Uploads a real, text-extractable PDF and polls the (Phase 7) detail endpoint until AI analysis lands. */
    async function uploadAndWaitForAnalysis(
      accessToken: string,
      label: string,
    ): Promise<string> {
      const pdfBytes = buildMinimalPdf(`BT /F1 24 Tf 50 100 Td (${label}) Tj ET`);

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

    /** Polls the detail endpoint until `state` matches, using the (Phase 7) GET /trust-records/:id endpoint end-to-end. */
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
      throw new Error(
        `Timed out waiting for TrustRecord ${trustRecordId} to reach ${state} (last seen: ${JSON.stringify(last)})`,
      );
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
      walletClient = createWalletClient({ account, chain, transport: http(ANVIL_RPC_URL) });

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
      // Real Base Sepolia block time is ~2s; anvil mines near-instantly.
      // A short poll interval keeps this test fast without changing
      // production defaults (design.md's 15s guess is untouched).
      process.env["CONFIRM_ANCHOR_POLL_INTERVAL_SECONDS"] = "1";

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
    });

    it("S-GOLDEN-1: upload -> analyze -> review -> confirm -> anchor -> confirm-anchor -> CERTIFIED with a real 2-confirmation tx", async () => {
      const user = await createAuthenticatedUser("golden-path");
      const trustRecordId = await uploadAndWaitForAnalysis(user.accessToken, "S-GOLDEN-1");

      const confirmRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/confirm`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send();
      expect(confirmRes.status).toBe(201);
      expect(confirmRes.body.state).toBe("READY");

      const anchorRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/anchor`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send();
      expect(anchorRes.status).toBe(201);
      expect(anchorRes.body.state).toBe("ANCHORING");

      // Wait for the real anchor-dtr job to submit the tx (anvil auto-mines
      // it immediately -> confirmations=1). Then force a SECOND block so
      // confirm-anchor's poll observes >=2 confirmations (INV-32).
      const afterSubmit = await waitForAnchorTxSubmitted(user.accessToken, trustRecordId);
      expect(afterSubmit["anchor"]).toMatchObject({ status: "PENDING" });
      await mineExtraBlock();

      const certified = await waitForState(user.accessToken, trustRecordId, "CERTIFIED", 30_000);
      expect(certified["anchor"]).toMatchObject({ status: "CONFIRMED" });
      expect(typeof (certified["anchor"] as Record<string, unknown>)["txHash"]).toBe("string");
      expect((certified["anchor"] as Record<string, unknown>)["blockTimestamp"]).toBeTruthy();

      const dbAnchor = await prisma.trustRecord.findUnique({
        where: { id: trustRecordId },
        include: { anchor: true },
      });
      expect(dbAnchor?.state).toBe("CERTIFIED");
      expect(dbAnchor?.anchor?.status).toBe("CONFIRMED");
      expect(dbAnchor?.anchor?.txHash).toMatch(/^0x[0-9a-f]{64}$/);

      // Independently verify the txHash on-chain — not just trusting the DB.
      const isAnchored = await publicClient.readContract({
        address: contractAddress,
        abi: ANCHOR_REGISTRY_ABI,
        functionName: "isAnchored",
        args: [`0x${dbAnchor!.canonicalHash}` as `0x${string}`],
      });
      expect(isAnchored).toBe(true);

      async function waitForAnchorTxSubmitted(
        accessToken: string,
        id: string,
      ): Promise<Record<string, unknown>> {
        const deadline = Date.now() + 15_000;
        while (Date.now() < deadline) {
          const res = await request(app.getHttpServer())
            .get(`/trust-records/${id}`)
            .set("Authorization", `Bearer ${accessToken}`)
            .send();
          const anchor = res.body.anchor as Record<string, unknown> | null;
          if (anchor?.["txHash"]) {
            return res.body as Record<string, unknown>;
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        throw new Error(`Timed out waiting for anchor-dtr to submit a tx for ${id}`);
      }
    });

    it("S-GOLDEN-2: AlreadyAnchored shortcut — pre-anchoring the hash out-of-band certifies immediately, with no confirm-anchor polling needed", async () => {
      const user = await createAuthenticatedUser("golden-already-anchored");
      const trustRecordId = await uploadAndWaitForAnalysis(user.accessToken, "S-GOLDEN-2");

      const confirmRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/confirm`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send();
      expect(confirmRes.status).toBe(201);
      const canonicalHash = confirmRes.body.canonicalHash as string;

      // Pre-anchor the SAME hash directly against the contract, entirely
      // out-of-band from the app (simulates the hash having already been
      // anchored by a prior worker attempt — RNF-022 durability scenario).
      const preAnchorTxHash = await walletClient.writeContract({
        address: contractAddress,
        abi: ANCHOR_REGISTRY_ABI,
        functionName: "anchor",
        args: [`0x${canonicalHash}` as `0x${string}`],
        chain: null,
        account: walletClient.account!,
      });
      await publicClient.waitForTransactionReceipt({ hash: preAnchorTxHash });

      const anchorRes = await request(app.getHttpServer())
        .post(`/trust-records/${trustRecordId}/anchor`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send();
      expect(anchorRes.status).toBe(201);
      expect(anchorRes.body.state).toBe("ANCHORING");

      // No mineExtraBlock() call here: AlreadyAnchored certifies immediately
      // in the SAME anchor-dtr job run, with no confirm-anchor poll cycle.
      const certified = await waitForState(user.accessToken, trustRecordId, "CERTIFIED", 15_000);
      expect(certified["anchor"]).toMatchObject({ status: "CONFIRMED", txHash: null });
      expect(certified["anchor"] && (certified["anchor"] as Record<string, unknown>)["blockTimestamp"]).toBeTruthy();

      const record = await prisma.trustRecord.findUnique({ where: { id: trustRecordId } });
      expect(record?.state).toBe("CERTIFIED");
    });
  },
);
