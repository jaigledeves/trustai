import { describe, expect, it } from "vitest";
import { sha256Hex } from "../src/hash.js";
import type { TrustRecordV1 } from "../src/schema.js";
import { verifyAssetAgainstRecord } from "../src/verify.js";

// Minimal valid TrustRecordV1 factory for tests.
function makeRecord(overrides: Partial<TrustRecordV1> = {}): TrustRecordV1 {
  return {
    schemaVersion: "dtr-1",
    asset: {
      sha256: "a".repeat(64),
      mimeType: "application/pdf",
      sizeBytes: 1024,
      ...overrides.asset,
    },
    analysis: {
      summary: "A short summary of the document.",
      classification: "contrato",
      language: "es",
      ...overrides.analysis,
    },
    provenance: {
      provider: "openai",
      model: "gpt-5.4-mini",
      modelVersion: "2506",
      promptVersion: "analysis-v1.0",
      taxonomyVersion: "v1",
      analyzedAt: "2026-07-05T18:30:00Z",
      ...overrides.provenance,
    },
    issuedAt: "2026-07-05T18:30:00Z",
    ...overrides,
  };
}

describe("verifyAssetAgainstRecord — asset_verified", () => {
  it("returns asset_verified when hash matches", async () => {
    const assetContent = "hello, trustai";
    const assetHash = await sha256Hex(assetContent);
    const record = makeRecord({ asset: { sha256: assetHash, mimeType: "text/plain", sizeBytes: 14 } });

    const result = await verifyAssetAgainstRecord(record, assetHash);

    expect(result.status).toBe("asset_verified");
    if (result.status === "asset_verified") {
      expect(result.record.schemaVersion).toBe("dtr-1");
      expect(typeof result.canonicalHash).toBe("string");
      expect(result.canonicalHash).toHaveLength(64);
    }
  });

  it("canonicalHash is stable across calls (deterministic)", async () => {
    const assetHash = "b".repeat(64);
    const record = makeRecord({ asset: { sha256: assetHash, mimeType: "application/pdf", sizeBytes: 512 } });

    const r1 = await verifyAssetAgainstRecord(record, assetHash);
    const r2 = await verifyAssetAgainstRecord(record, assetHash);

    expect(r1.status).toBe("asset_verified");
    expect(r2.status).toBe("asset_verified");
    if (r1.status === "asset_verified" && r2.status === "asset_verified") {
      expect(r1.canonicalHash).toBe(r2.canonicalHash);
    }
  });

  it("is case-insensitive on the supplied hash", async () => {
    const assetHash = "aabbcc" + "0".repeat(58);
    const record = makeRecord({ asset: { sha256: assetHash, mimeType: "application/pdf", sizeBytes: 100 } });

    const lower = await verifyAssetAgainstRecord(record, assetHash.toLowerCase());
    const upper = await verifyAssetAgainstRecord(record, assetHash.toUpperCase());

    expect(lower.status).toBe("asset_verified");
    expect(upper.status).toBe("asset_verified");
  });
});

describe("verifyAssetAgainstRecord — asset_mismatch", () => {
  it("detects a tampered document (one byte different hash)", async () => {
    const originalHash = "a".repeat(64);
    const tamperedHash  = "b".repeat(64);
    const record = makeRecord({ asset: { sha256: originalHash, mimeType: "application/pdf", sizeBytes: 512 } });

    const result = await verifyAssetAgainstRecord(record, tamperedHash);

    expect(result.status).toBe("asset_mismatch");
    if (result.status === "asset_mismatch") {
      expect(result.expectedSha256).toBe(originalHash);
      expect(result.actualSha256).toBe(tamperedHash);
    }
  });
});

describe("verifyAssetAgainstRecord — invalid_record", () => {
  it("rejects null", async () => {
    const result = await verifyAssetAgainstRecord(null, "a".repeat(64));
    expect(result.status).toBe("invalid_record");
  });

  it("rejects a missing schemaVersion", async () => {
    const { schemaVersion: _, ...noVersion } = makeRecord();
    const result = await verifyAssetAgainstRecord(noVersion, "a".repeat(64));
    expect(result.status).toBe("invalid_record");
    if (result.status === "invalid_record") {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects an unknown classification", async () => {
    const record = makeRecord();
    const tampered = {
      ...record,
      analysis: { ...record.analysis, classification: "unknown_type" },
    };
    const result = await verifyAssetAgainstRecord(tampered, "a".repeat(64));
    expect(result.status).toBe("invalid_record");
  });

  it("rejects a malformed asset sha256", async () => {
    const record = makeRecord({ asset: { sha256: "not-a-hash", mimeType: "application/pdf", sizeBytes: 1 } });
    const result = await verifyAssetAgainstRecord(record, "a".repeat(64));
    expect(result.status).toBe("invalid_record");
  });
});
