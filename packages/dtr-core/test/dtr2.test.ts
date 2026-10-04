import { describe, expect, it } from "vitest";
import { canonicalize } from "../src/canonicalize.js";
import { computeCanonicalHash, sha256Hex } from "../src/hash.js";
import {
  computeAnchoredHash,
  computeDtr2AnchorHash,
  computeDtr2CoreHash,
  computeDtr2Hashes,
} from "../src/dtr2-hash.js";
import {
  DTR_SCHEMA_VERSION_V2,
  parseAnyTrustRecord,
  type TrustRecordV1,
  type TrustRecordV2,
} from "../src/schema.js";
import { verifyAssetAgainstRecord, verifyDtr2Proof } from "../src/verify.js";

const ASSET_SHA256 = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

interface V2Overrides {
  issuedAt?: string;
  core?: Partial<TrustRecordV2["core"]["asset"]>;
  filename?: string;
  analysis?: Partial<TrustRecordV2["enrichment"]["analysis"]>;
  provenance?: Partial<TrustRecordV2["enrichment"]["provenance"]>;
}

function makeV2(overrides: V2Overrides = {}): TrustRecordV2 {
  return {
    schemaVersion: "dtr-2",
    issuedAt: overrides.issuedAt ?? "2026-10-04T12:00:00.000Z",
    core: {
      asset: {
        sha256: ASSET_SHA256,
        mimeType: "application/pdf",
        sizeBytes: 48213,
        ...overrides.core,
      },
    },
    enrichment: {
      asset: { filename: overrides.filename ?? "contrato año.pdf" },
      analysis: {
        summary: "Contrato de arrendamiento de vivienda en Málaga; fianza de 1.200 €.",
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
        analyzedAt: "2026-10-04T11:59:58.120Z",
        ...overrides.provenance,
      },
    },
  };
}

function makeV1(): TrustRecordV1 {
  const v2 = makeV2();
  return {
    schemaVersion: "dtr-1",
    asset: { ...v2.core.asset, ...v2.enrichment.asset },
    analysis: v2.enrichment.analysis,
    provenance: v2.enrichment.provenance,
    issuedAt: v2.issuedAt,
  };
}

// Pinned test vectors (ADR-015). Never edit them to make a test pass.
const GOLDEN_CORE_HASH = "4e0e672d46be24c06169679e0727e0afce65bbac9e8d83ad9fd8177e98d24802";
const GOLDEN_ENRICHMENT_HASH = "b19f7fe94680ca65d7d34eccbd099a1aef8702aa8a5f9d6331c8b00ba502c514";
const GOLDEN_ANCHOR_HASH = "9f8c2d775d90c88594687f16ba2652fae2ffc184d5f77881ca01e14331eee0c9";

describe("dtr-2 hashes — golden vectors", () => {
  it("pins coreHash, enrichmentHash and anchorHash for the fixture", async () => {
    await expect(computeDtr2Hashes(makeV2())).resolves.toEqual({
      coreHash: GOLDEN_CORE_HASH,
      enrichmentHash: GOLDEN_ENRICHMENT_HASH,
      anchorHash: GOLDEN_ANCHOR_HASH,
    });
  });

  it("follows the ADR-015 formulas over JCS + SHA-256", async () => {
    const record = makeV2();
    const coreHash = await sha256Hex(canonicalize(record.core));
    const enrichmentHash = await sha256Hex(canonicalize(record.enrichment));
    const anchorHash = await sha256Hex(
      canonicalize({ schemaVersion: "dtr-2", issuedAt: record.issuedAt, coreHash, enrichmentHash }),
    );
    await expect(computeDtr2Hashes(record)).resolves.toEqual({ coreHash, enrichmentHash, anchorHash });
  });

  it("computes coreHash from the file facts alone", async () => {
    await expect(
      computeDtr2CoreHash({ sha256: ASSET_SHA256, mimeType: "application/pdf", sizeBytes: 48213 }),
    ).resolves.toBe(GOLDEN_CORE_HASH);
  });
});

describe("dtr-2 hashes — what each change affects", () => {
  const enrichmentChanges: Array<[string, V2Overrides]> = [
    ["summary", { analysis: { summary: "Otro resumen." } }],
    ["classification", { analysis: { classification: "factura" } }],
    ["language", { analysis: { language: "en" } }],
    ["provider", { provenance: { provider: "anthropic" } }],
    ["model", { provenance: { model: "other-model" } }],
    ["modelVersion", { provenance: { modelVersion: "2507" } }],
    ["promptVersion", { provenance: { promptVersion: "analysis-v1.1" } }],
    ["analyzedAt", { provenance: { analyzedAt: "2026-10-04T11:59:59.000Z" } }],
    ["filename", { filename: "otro.pdf" }],
  ];

  it.each(enrichmentChanges)(
    "changing %s changes enrichmentHash and anchorHash but not coreHash",
    async (_field, change) => {
      const base = await computeDtr2Hashes(makeV2());
      const changed = await computeDtr2Hashes(makeV2(change));
      expect(changed.coreHash).toBe(base.coreHash);
      expect(changed.enrichmentHash).not.toBe(base.enrichmentHash);
      expect(changed.anchorHash).not.toBe(base.anchorHash);
    },
  );

  it.each<[string, Partial<TrustRecordV2["core"]["asset"]>]>([
    ["sha256", { sha256: "b".repeat(64) }],
    ["mimeType", { mimeType: "text/plain" }],
    ["sizeBytes", { sizeBytes: 48214 }],
  ])("changing %s changes coreHash and anchorHash", async (_field, core) => {
    const base = await computeDtr2Hashes(makeV2());
    const changed = await computeDtr2Hashes(makeV2({ core }));
    expect(changed.coreHash).not.toBe(base.coreHash);
    expect(changed.enrichmentHash).toBe(base.enrichmentHash);
    expect(changed.anchorHash).not.toBe(base.anchorHash);
  });

  it("changing issuedAt changes only anchorHash (same file certified twice)", async () => {
    const first = await computeDtr2Hashes(makeV2());
    const second = await computeDtr2Hashes(makeV2({ issuedAt: "2026-10-05T09:00:00.000Z" }));
    expect(second.coreHash).toBe(first.coreHash);
    expect(second.enrichmentHash).toBe(first.enrichmentHash);
    expect(second.anchorHash).not.toBe(first.anchorHash);
  });
});

describe("parseAnyTrustRecord — version dispatcher", () => {
  it("exposes the dtr-2 version constant", () => {
    expect(DTR_SCHEMA_VERSION_V2).toBe("dtr-2");
  });

  it("parses a dtr-1 record", () => {
    const parsed = parseAnyTrustRecord(makeV1());
    expect(parsed.ok && parsed.record.schemaVersion).toBe("dtr-1");
  });

  it("parses a dtr-2 record with a filename", () => {
    const parsed = parseAnyTrustRecord(makeV2());
    expect(parsed.ok && parsed.record.schemaVersion).toBe("dtr-2");
  });

  it("parses a dtr-2 record whose enrichment.asset is empty (no filename)", () => {
    const record = makeV2();
    const parsed = parseAnyTrustRecord({ ...record, enrichment: { ...record.enrichment, asset: {} } });
    expect(parsed.ok).toBe(true);
  });

  it("rejects a dtr-2 record without enrichment.asset (always present, filename optional)", () => {
    const { asset: _asset, ...enrichment } = makeV2().enrichment;
    const parsed = parseAnyTrustRecord({ ...makeV2(), enrichment });
    expect(parsed.ok).toBe(false);
  });

  it("rejects unknown versions", () => {
    const parsed = parseAnyTrustRecord({ ...makeV2(), schemaVersion: "dtr-3" });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.issues[0]).toContain("schemaVersion");
  });

  it("rejects non-objects", () => {
    expect(parseAnyTrustRecord(null).ok).toBe(false);
  });

  it("rejects a dtr-2 version string with a dtr-1 body", () => {
    expect(parseAnyTrustRecord({ ...makeV1(), schemaVersion: "dtr-2" }).ok).toBe(false);
  });

  it("rejects a dtr-1 version string with a dtr-2 body", () => {
    expect(parseAnyTrustRecord({ ...makeV2(), schemaVersion: "dtr-1" }).ok).toBe(false);
  });

  it("rejects extra keys at every dtr-2 level (strict)", () => {
    const r = makeV2();
    const variants = [
      { ...r, extra: 1 },
      { ...r, core: { ...r.core, extra: 1 } },
      { ...r, core: { asset: { ...r.core.asset, filename: "x.pdf" } } },
      { ...r, enrichment: { ...r.enrichment, extra: 1 } },
      { ...r, enrichment: { ...r.enrichment, asset: { filename: "x.pdf", sha256: ASSET_SHA256 } } },
      { ...r, enrichment: { ...r.enrichment, analysis: { ...r.enrichment.analysis, extra: 1 } } },
      { ...r, enrichment: { ...r.enrichment, provenance: { ...r.enrichment.provenance, extra: 1 } } },
    ];
    for (const variant of variants) {
      expect(parseAnyTrustRecord(variant).ok).toBe(false);
    }
  });
});

describe("computeAnchoredHash", () => {
  it("returns the dtr-1 canonical hash for dtr-1 records", async () => {
    const v1 = makeV1();
    await expect(computeAnchoredHash(v1)).resolves.toBe(await computeCanonicalHash(v1));
  });

  it("returns anchorHash for dtr-2 records", async () => {
    await expect(computeAnchoredHash(makeV2())).resolves.toBe(GOLDEN_ANCHOR_HASH);
  });
});

describe("verifyAssetAgainstRecord — both versions", () => {
  it("verifies a dtr-2 record against core.asset.sha256 and returns anchorHash", async () => {
    const result = await verifyAssetAgainstRecord(makeV2(), ASSET_SHA256.toUpperCase());
    expect(result.status).toBe("asset_verified");
    if (result.status === "asset_verified") {
      expect(result.canonicalHash).toBe(GOLDEN_ANCHOR_HASH);
    }
  });

  it("reports a dtr-2 asset mismatch", async () => {
    const result = await verifyAssetAgainstRecord(makeV2(), "b".repeat(64));
    expect(result).toMatchObject({
      status: "asset_mismatch",
      expectedSha256: ASSET_SHA256,
      actualSha256: "b".repeat(64),
    });
  });

  it("verifies a dtr-1 record and returns its canonical hash", async () => {
    const v1 = makeV1();
    const result = await verifyAssetAgainstRecord(v1, ASSET_SHA256);
    expect(result.status).toBe("asset_verified");
    if (result.status === "asset_verified") {
      expect(result.canonicalHash).toBe(await computeCanonicalHash(v1));
    }
  });

  it("reports a dtr-1 asset mismatch", async () => {
    const result = await verifyAssetAgainstRecord(makeV1(), "b".repeat(64));
    expect(result.status).toBe("asset_mismatch");
  });
});

describe("verifyDtr2Proof — minimal proof without the AI text", () => {
  const proof = {
    schemaVersion: "dtr-2" as const,
    issuedAt: "2026-10-04T12:00:00.000Z",
    coreHash: GOLDEN_CORE_HASH,
    enrichmentHash: GOLDEN_ENRICHMENT_HASH,
  };
  const fileFacts = { sha256: ASSET_SHA256, mimeType: "application/pdf", sizeBytes: 48213 };

  it("recomputes coreHash from the file and anchorHash from the proof", async () => {
    await expect(verifyDtr2Proof(proof, fileFacts)).resolves.toEqual({
      status: "core_verified",
      coreHash: GOLDEN_CORE_HASH,
      anchorHash: GOLDEN_ANCHOR_HASH,
    });
  });

  it("accepts an uppercase file sha256", async () => {
    const result = await verifyDtr2Proof(proof, { ...fileFacts, sha256: ASSET_SHA256.toUpperCase() });
    expect(result.status).toBe("core_verified");
  });

  it("anchorHash from the proof matches computeDtr2AnchorHash", async () => {
    await expect(computeDtr2AnchorHash(proof)).resolves.toBe(GOLDEN_ANCHOR_HASH);
  });

  it("reports core_mismatch when the file differs from the proof", async () => {
    const result = await verifyDtr2Proof(proof, { ...fileFacts, sizeBytes: 1 });
    expect(result).toMatchObject({ status: "core_mismatch", expectedCoreHash: GOLDEN_CORE_HASH });
  });

  it("rejects a malformed proof", async () => {
    const result = await verifyDtr2Proof({ ...proof, coreHash: "nope" }, fileFacts);
    expect(result.status).toBe("invalid_proof");
  });

  it("rejects malformed file facts", async () => {
    const result = await verifyDtr2Proof(proof, { ...fileFacts, sizeBytes: 0 });
    expect(result.status).toBe("invalid_proof");
  });
});
