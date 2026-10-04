import { describe, expect, it } from "vitest";
import {
  PROOF_PACKAGE_FORMAT_V1,
  ProofPackageV1Schema,
  computeDtr2Hashes,
  verifyProofPackageAgainstFile,
  type ProofPackageV1,
  type TrustRecordV2,
} from "../src/index.js";

// Same fixture and pinned vectors as the dtr-2 golden test (dtr2.test.ts, ADR-015).
const ASSET_SHA256 = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
const GOLDEN_CORE_HASH = "4e0e672d46be24c06169679e0727e0afce65bbac9e8d83ad9fd8177e98d24802";
const GOLDEN_ENRICHMENT_HASH = "b19f7fe94680ca65d7d34eccbd099a1aef8702aa8a5f9d6331c8b00ba502c514";
const GOLDEN_ANCHOR_HASH = "9f8c2d775d90c88594687f16ba2652fae2ffc184d5f77881ca01e14331eee0c9";

const GOLDEN_RECORD: TrustRecordV2 = {
  schemaVersion: "dtr-2",
  issuedAt: "2026-10-04T12:00:00.000Z",
  core: { asset: { sha256: ASSET_SHA256, mimeType: "application/pdf", sizeBytes: 48213 } },
  enrichment: {
    asset: { filename: "contrato año.pdf" },
    analysis: {
      summary: "Contrato de arrendamiento de vivienda en Málaga; fianza de 1.200 €.",
      classification: "contrato",
      language: "es",
    },
    provenance: {
      provider: "openai",
      model: "gpt-5.4-mini",
      modelVersion: "2506",
      promptVersion: "analysis-v1.0",
      taxonomyVersion: "v1",
      analyzedAt: "2026-10-04T11:59:58.120Z",
    },
  },
};

const FILE_FACTS = { sha256: ASSET_SHA256, mimeType: "application/pdf", sizeBytes: 48213 };

function goldenPackage(): ProofPackageV1 {
  return {
    format: "ancrux-proof-1",
    trustRecordId: "5b0c4f7e-6a1d-4c39-9f0e-2d8a7b1c3e45",
    dtr: {
      schemaVersion: "dtr-2",
      issuedAt: "2026-10-04T12:00:00.000Z",
      coreHash: GOLDEN_CORE_HASH,
      enrichmentHash: GOLDEN_ENRICHMENT_HASH,
      anchorHash: GOLDEN_ANCHOR_HASH,
    },
    algorithms: { hash: "SHA-256", canonicalization: "RFC 8785 (JCS)" },
    anchor: {
      chainId: 84532,
      network: "base-sepolia",
      contractAddress: "0xe6738fb0aF94822a3831c8e0a65b5C6d20607C22",
      txHash: `0x${"ab".repeat(32)}`,
      blockNumber: "18734512",
      blockTimestamp: "2026-10-04T12:00:14.000Z",
    },
  };
}

describe("ProofPackageV1Schema", () => {
  it("pins the format id", () => {
    expect(PROOF_PACKAGE_FORMAT_V1).toBe("ancrux-proof-1");
  });

  it("accepts a well-formed package", () => {
    expect(ProofPackageV1Schema.safeParse(goldenPackage()).success).toBe(true);
  });

  it("accepts an anchor without transaction data (already anchored before submission)", () => {
    const pkg = goldenPackage();
    pkg.anchor = { ...pkg.anchor, txHash: null, blockNumber: null, blockTimestamp: null };
    expect(ProofPackageV1Schema.safeParse(pkg).success).toBe(true);
  });

  it.each<[string, (pkg: Record<string, unknown>) => void]>([
    ["an unknown format", (pkg) => (pkg["format"] = "ancrux-proof-2")],
    ["an extra top-level key (e.g. analysis)", (pkg) => (pkg["analysis"] = { summary: "x" })],
    ["an extra dtr key (e.g. filename)", (pkg) => ((pkg["dtr"] as Record<string, unknown>)["filename"] = "a.pdf")],
    ["a dtr-1 schema version", (pkg) => ((pkg["dtr"] as Record<string, unknown>)["schemaVersion"] = "dtr-1")],
    ["a non-hex anchorHash", (pkg) => ((pkg["dtr"] as Record<string, unknown>)["anchorHash"] = "zz")],
    ["another hash algorithm", (pkg) => ((pkg["algorithms"] as Record<string, unknown>)["hash"] = "SHA-1")],
    ["a malformed contract address", (pkg) => ((pkg["anchor"] as Record<string, unknown>)["contractAddress"] = "0x123")],
    ["a numeric blockNumber", (pkg) => ((pkg["anchor"] as Record<string, unknown>)["blockNumber"] = 18734512)],
    ["a non-UTC block timestamp", (pkg) => ((pkg["anchor"] as Record<string, unknown>)["blockTimestamp"] = "2026-10-04 12:00")],
  ])("rejects %s", (_label, mutate) => {
    const pkg = goldenPackage() as unknown as Record<string, unknown>;
    mutate(pkg);
    expect(ProofPackageV1Schema.safeParse(pkg).success).toBe(false);
  });
});

describe("verifyProofPackageAgainstFile", () => {
  it("verifies the golden package built from the dtr-2 fixture against its file facts", async () => {
    const hashes = await computeDtr2Hashes(GOLDEN_RECORD);
    expect(hashes.anchorHash).toBe(GOLDEN_ANCHOR_HASH);

    const result = await verifyProofPackageAgainstFile(goldenPackage(), FILE_FACTS);

    expect(result).toEqual({
      status: "verified",
      coreHash: GOLDEN_CORE_HASH,
      anchorHash: GOLDEN_ANCHOR_HASH,
      anchor: goldenPackage().anchor,
    });
  });

  it("reports a different file as core_mismatch", async () => {
    const result = await verifyProofPackageAgainstFile(goldenPackage(), { ...FILE_FACTS, sizeBytes: 48214 });

    expect(result).toMatchObject({ status: "core_mismatch", expectedCoreHash: GOLDEN_CORE_HASH });
  });

  it("detects a package whose anchorHash does not follow from its own fields", async () => {
    const pkg = goldenPackage();
    pkg.dtr.issuedAt = "2026-10-04T12:00:01.000Z";

    const result = await verifyProofPackageAgainstFile(pkg, FILE_FACTS);

    expect(result).toMatchObject({ status: "anchor_hash_mismatch", declaredAnchorHash: GOLDEN_ANCHOR_HASH });
    if (result.status === "anchor_hash_mismatch") {
      expect(result.computedAnchorHash).not.toBe(GOLDEN_ANCHOR_HASH);
    }
  });

  it("returns invalid_package for a malformed package, never throwing", async () => {
    const result = await verifyProofPackageAgainstFile({ format: "ancrux-proof-1" }, FILE_FACTS);

    expect(result.status).toBe("invalid_package");
  });

  it("returns invalid_package with file issues for malformed file facts", async () => {
    const result = await verifyProofPackageAgainstFile(goldenPackage(), { sha256: "nope" });

    expect(result.status).toBe("invalid_package");
    if (result.status === "invalid_package") {
      expect(result.issues.some((issue) => issue.startsWith("file."))).toBe(true);
    }
  });
});
