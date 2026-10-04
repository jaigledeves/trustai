import { Logger } from "@nestjs/common";
import {
  BASE_SEPOLIA_ANCHOR_REGISTRY,
  ProofPackageV1Schema,
  computeDtr2Hashes,
  sha256Hex,
  verifyProofPackageAgainstFile,
  type Dtr2Hashes,
} from "@trustai/dtr-core";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Anchor, AnchorStatus } from "../../domain/anchor.entity";
import { AssetStatus, DigitalAsset } from "../../domain/digital-asset.entity";
import { TrustRecord, TrustRecordState } from "../../domain/trust-record.entity";
import type {
  TrustRecordRepositoryPort,
  TrustRecordWithAssetAndAnchor,
} from "../../ports/trust-record-repository.port";
import { GetProofPackageUseCase } from "./get-proof-package.use-case";

const ISSUED_AT = "2026-07-05T18:30:00.000Z";
const FILE_BYTES = new TextEncoder().encode("proof package fixture");
const TX_HASH = `0x${"cd".repeat(32)}`;
const ANVIL_CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

let fileSha256: string;
let hashes: Dtr2Hashes;

beforeAll(async () => {
  fileSha256 = await sha256Hex(FILE_BYTES);
  hashes = await computeDtr2Hashes({
    schemaVersion: "dtr-2",
    issuedAt: ISSUED_AT,
    core: { asset: { sha256: fileSha256, mimeType: "application/pdf", sizeBytes: FILE_BYTES.length } },
    enrichment: {
      asset: { filename: "contract.pdf" },
      analysis: { summary: "A reviewed summary.", classification: "contrato", language: "es" },
      provenance: {
        provider: "stub",
        model: "stub-deterministic",
        modelVersion: "1.0.0",
        promptVersion: "v1",
        taxonomyVersion: "v1",
        analyzedAt: ISSUED_AT,
      },
    },
  });
});

function withOverrides<T extends object>(base: T, overrides: Partial<T>): T {
  return Object.assign(Object.create(Object.getPrototypeOf(base)), base, overrides);
}

function buildFound(
  record: Partial<TrustRecord> = {},
  anchor: Partial<Anchor> | null = {},
): TrustRecordWithAssetAndAnchor {
  const trustRecord = new TrustRecord(
    "trust-record-1",
    "dtr-2",
    "asset-1",
    fileSha256,
    hashes.anchorHash,
    TrustRecordState.CERTIFIED,
    1,
    "A reviewed summary.",
    "contrato",
    "es",
    "stub",
    "stub-deterministic",
    "1.0.0",
    "v1",
    "v1",
    new Date(ISSUED_AT),
    "user-1",
    "anchor-1",
    new Date(),
    new Date(),
  );
  const asset = new DigitalAsset(
    "asset-1",
    fileSha256,
    "application/pdf",
    FILE_BYTES.length,
    "contract.pdf",
    "org-1/asset-1",
    AssetStatus.READY,
    "org-1",
    "user-1",
    new Date(),
  );
  const storedAnchor = new Anchor(
    "anchor-1",
    "base",
    "anvil-local",
    TX_HASH,
    null,
    new Date("2026-07-06T00:00:00.000Z"),
    AnchorStatus.CONFIRMED,
    new Date(),
    new Date(),
    31337,
    18734512n,
    ANVIL_CONTRACT,
  );
  return {
    trustRecord: withOverrides(trustRecord, record),
    issuedAt: ISSUED_AT,
    asset,
    anchor: anchor === null ? null : withOverrides(storedAnchor, anchor),
  };
}

function useCaseReturning(found: TrustRecordWithAssetAndAnchor | null): GetProofPackageUseCase {
  const repository = {
    findByIdWithAssetAndAnchor: vi.fn(async () => found),
  } as unknown as TrustRecordRepositoryPort;
  return new GetProofPackageUseCase(repository);
}

describe("GetProofPackageUseCase", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds an ancrux-proof-1 package for a CERTIFIED dtr-2 record from dtr-core hashes and the stored anchor", async () => {
    const result = await useCaseReturning(buildFound()).execute("trust-record-1");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.proof).toEqual({
      format: "ancrux-proof-1",
      trustRecordId: "trust-record-1",
      dtr: {
        schemaVersion: "dtr-2",
        issuedAt: ISSUED_AT,
        coreHash: hashes.coreHash,
        enrichmentHash: hashes.enrichmentHash,
        anchorHash: hashes.anchorHash,
      },
      algorithms: { hash: "SHA-256", canonicalization: "RFC 8785 (JCS)" },
      anchor: {
        chainId: 31337,
        network: "anvil-local",
        contractAddress: ANVIL_CONTRACT,
        txHash: TX_HASH,
        blockNumber: "18734512",
        blockTimestamp: "2026-07-06T00:00:00.000Z",
      },
    });
    expect(ProofPackageV1Schema.safeParse(result.proof).success).toBe(true);
    await expect(
      verifyProofPackageAgainstFile(result.proof, {
        sha256: fileSha256,
        mimeType: "application/pdf",
        sizeBytes: FILE_BYTES.length,
      }),
    ).resolves.toMatchObject({ status: "verified", anchorHash: hashes.anchorHash });
  });

  it("never includes the AI analysis or the filename (INV-41)", async () => {
    const result = await useCaseReturning(buildFound()).execute("trust-record-1");

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("A reviewed summary.");
    expect(serialized).not.toContain("contract.pdf");
    expect(serialized).not.toContain("stub-deterministic");
  });

  it("falls back to the known deployment for its network when an anchor predates C1", async () => {
    const found = buildFound(
      {},
      { network: "base-sepolia", chainId: null, contractAddress: null, blockNumber: null },
    );

    const result = await useCaseReturning(found).execute("trust-record-1");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.proof.anchor).toMatchObject({
      chainId: BASE_SEPOLIA_ANCHOR_REGISTRY.chainId,
      network: "base-sepolia",
      contractAddress: BASE_SEPOLIA_ANCHOR_REGISTRY.address,
      blockNumber: null,
    });
  });

  it("refuses when a pre-C1 anchor's network has no known deployment", async () => {
    const found = buildFound({}, { network: "mars-net", chainId: null, contractAddress: null });

    await expect(useCaseReturning(found).execute("trust-record-1")).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("returns not_found for an unknown id", async () => {
    await expect(useCaseReturning(null).execute("missing")).resolves.toEqual({ status: "not_found" });
  });

  it("returns legacy_record for a dtr-1 record (verified by the server only)", async () => {
    const found = buildFound({ schemaVersion: "dtr-1" });

    await expect(useCaseReturning(found).execute("trust-record-1")).resolves.toEqual({
      status: "legacy_record",
    });
  });

  it.each([
    TrustRecordState.DRAFT,
    TrustRecordState.READY,
    TrustRecordState.ANCHORING,
    TrustRecordState.FAILED,
    TrustRecordState.DISCARDED,
  ])("returns not_anchored for a %s record", async (state) => {
    await expect(useCaseReturning(buildFound({ state })).execute("trust-record-1")).resolves.toEqual({
      status: "not_anchored",
    });
  });

  it("returns not_anchored for a CERTIFIED record without an anchor row", async () => {
    await expect(useCaseReturning(buildFound({}, null)).execute("trust-record-1")).resolves.toEqual({
      status: "not_anchored",
    });
  });

  it("refuses a record altered after certification and warns with its id only", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const found = buildFound({ aiSummary: "Altered after certification." });

    const result = await useCaseReturning(found).execute("trust-record-1");

    expect(result).toEqual({ status: "unavailable" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("trust-record-1"));
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("Altered"));
  });

  it("refuses a record whose stored columns no longer form a valid dtr-2", async () => {
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const found = buildFound({ aiClassification: "not-a-class" });

    await expect(useCaseReturning(found).execute("trust-record-1")).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("refuses when the stored anchor data cannot form a valid package", async () => {
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const found = buildFound({}, { txHash: "0xnot-a-hash" });

    await expect(useCaseReturning(found).execute("trust-record-1")).resolves.toEqual({
      status: "unavailable",
    });
  });
});
