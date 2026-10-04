import { describe, expect, it } from "vitest";
import {
  buildTrustRecordCandidate,
  buildTrustRecordV1Candidate,
  buildTrustRecordV2Candidate,
  type TrustRecordFields,
} from "../src/build.js";
import { computeAnchoredHash } from "../src/dtr2-hash.js";
import { computeCanonicalHash } from "../src/hash.js";
import { parseAnyTrustRecord, parseTrustRecord } from "../src/schema.js";

const fields: TrustRecordFields = {
  issuedAt: "2026-10-04T12:00:00.000Z",
  asset: {
    sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    mimeType: "application/pdf",
    sizeBytes: 48213,
    filename: "contrato año.pdf",
  },
  analysis: { summary: "Resumen.", classification: "contrato", language: "es" },
  provenance: {
    provider: "openai",
    model: "gpt-5.4-mini",
    modelVersion: "2506",
    promptVersion: "analysis-v1.0",
    taxonomyVersion: "v1",
    analyzedAt: "2026-10-04T11:59:58.120Z",
  },
};

describe("buildTrustRecordV1Candidate", () => {
  it("reproduces the API's historical dtr-1 rebuild byte-for-byte", async () => {
    // Literal copy of the object the API assembled before dtr-2 existed.
    const historical = {
      schemaVersion: "dtr-1",
      asset: {
        sha256: fields.asset.sha256,
        mimeType: fields.asset.mimeType,
        sizeBytes: fields.asset.sizeBytes,
        filename: fields.asset.filename,
      },
      analysis: fields.analysis,
      provenance: fields.provenance,
      issuedAt: fields.issuedAt,
    };
    const built = buildTrustRecordV1Candidate(fields);
    expect(built).toEqual(historical);
    await expect(computeCanonicalHash(built)).resolves.toBe(await computeCanonicalHash(historical));
  });

  it("omits filename entirely when it is null or empty", () => {
    for (const filename of [null, undefined, ""]) {
      const built = buildTrustRecordV1Candidate({ ...fields, asset: { ...fields.asset, filename } });
      expect(built.asset).not.toHaveProperty("filename");
      expect(parseTrustRecord(built).ok).toBe(true);
    }
  });

  it("passes missing analysis values through so parsing rejects them", () => {
    const built = buildTrustRecordV1Candidate({
      ...fields,
      analysis: { ...fields.analysis, summary: null },
      provenance: { ...fields.provenance, analyzedAt: undefined },
    });
    const parsed = parseTrustRecord(built);
    expect(parsed.ok).toBe(false);
  });
});

describe("buildTrustRecordV2Candidate", () => {
  it("splits the fields into core and enrichment", () => {
    expect(buildTrustRecordV2Candidate(fields)).toEqual({
      schemaVersion: "dtr-2",
      issuedAt: fields.issuedAt,
      core: {
        asset: { sha256: fields.asset.sha256, mimeType: "application/pdf", sizeBytes: 48213 },
      },
      enrichment: {
        asset: { filename: "contrato año.pdf" },
        analysis: fields.analysis,
        provenance: fields.provenance,
      },
    });
  });

  it("keeps enrichment.asset as an empty object when there is no filename", () => {
    const built = buildTrustRecordV2Candidate({ ...fields, asset: { ...fields.asset, filename: null } });
    expect(built.enrichment.asset).toEqual({});
    expect(parseAnyTrustRecord(built).ok).toBe(true);
  });
});

describe("buildTrustRecordCandidate — dispatch on schemaVersion", () => {
  it("builds dtr-2 for dtr-2", async () => {
    const parsed = parseAnyTrustRecord(buildTrustRecordCandidate("dtr-2", fields));
    expect(parsed.ok && parsed.record.schemaVersion).toBe("dtr-2");
    if (parsed.ok) {
      await expect(computeAnchoredHash(parsed.record)).resolves.toHaveLength(64);
    }
  });

  it("builds dtr-1 for dtr-1", () => {
    const parsed = parseAnyTrustRecord(buildTrustRecordCandidate("dtr-1", fields));
    expect(parsed.ok && parsed.record.schemaVersion).toBe("dtr-1");
  });

  it("keeps an unknown version as-is so parsing rejects it", () => {
    const parsed = parseAnyTrustRecord(buildTrustRecordCandidate("dtr-9", fields));
    expect(parsed.ok).toBe(false);
  });
});
