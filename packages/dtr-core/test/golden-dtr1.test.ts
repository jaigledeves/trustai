import { describe, expect, it } from "vitest";
import { buildTrustRecordCandidate } from "../src/build.js";
import { canonicalize } from "../src/canonicalize.js";
import { computeAnchoredHash } from "../src/dtr2-hash.js";
import { computeCanonicalHash } from "../src/hash.js";
import { parseAnyTrustRecord, parseTrustRecord, type TrustRecordV1 } from "../src/schema.js";

/**
 * Characterization test (ADR-015, INV-22): dtr-1 records already anchored
 * on-chain must keep hashing to exactly the same bytes forever. These
 * constants were computed with the dtr-1 code BEFORE dtr-2 was added and
 * must never be edited to make a test pass.
 */
const GOLDEN_DTR1_RECORD: TrustRecordV1 = {
  schemaVersion: "dtr-1",
  asset: {
    sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    mimeType: "application/pdf",
    sizeBytes: 48213,
    filename: "contrato año.pdf",
  },
  analysis: {
    summary: "Contrato de arrendamiento de vivienda en Málaga; duración de 12 meses y fianza de 1.200 €.",
    classification: "contrato",
    language: "es",
  },
  provenance: {
    provider: "openai",
    model: "gpt-5.4-mini",
    modelVersion: "2506",
    promptVersion: "analysis-v1.0",
    taxonomyVersion: "v1",
    analyzedAt: "2026-07-05T18:30:00.123Z",
  },
  issuedAt: "2026-07-05T18:31:02.456Z",
};

const GOLDEN_DTR1_CANONICAL_JSON =
  '{"analysis":{"classification":"contrato","language":"es","summary":"Co' +
  "ntrato de arrendamiento de vivienda en Málaga; duración de 12 meses y " +
  'fianza de 1.200 €."},"asset":{"filename":"contrato año.pdf","mimeType"' +
  ':"application/pdf","sha256":"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2' +
  'b0b822cd15d6c15b0f00a08","sizeBytes":48213},"issuedAt":"2026-07-05T18:' +
  '31:02.456Z","provenance":{"analyzedAt":"2026-07-05T18:30:00.123Z","mod' +
  'el":"gpt-5.4-mini","modelVersion":"2506","promptVersion":"analysis-v1.' +
  '0","provider":"openai","taxonomyVersion":"v1"},"schemaVersion":"dtr-1"' +
  "}";

const GOLDEN_DTR1_HASH = "1ad1295bda2ed24252d48b4ae0da41e20eafa6f48a47a56d729b5dbba86b25ce";

describe("dtr-1 golden record (frozen)", () => {
  it("is a valid dtr-1 record", () => {
    expect(parseTrustRecord(GOLDEN_DTR1_RECORD).ok).toBe(true);
  });

  it("canonicalizes to the pinned JSON string", () => {
    expect(canonicalize(GOLDEN_DTR1_RECORD)).toBe(GOLDEN_DTR1_CANONICAL_JSON);
  });

  it("hashes to the pinned SHA-256", async () => {
    await expect(computeCanonicalHash(GOLDEN_DTR1_RECORD)).resolves.toBe(GOLDEN_DTR1_HASH);
  });

  it("hashes to the pinned SHA-256 after a parse round-trip", async () => {
    const parsed = parseTrustRecord(JSON.parse(JSON.stringify(GOLDEN_DTR1_RECORD)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      await expect(computeCanonicalHash(parsed.record)).resolves.toBe(GOLDEN_DTR1_HASH);
    }
  });

  it("is reproduced from flat fields by the shared builder the API uses", async () => {
    const { schemaVersion, asset, analysis, provenance, issuedAt } = GOLDEN_DTR1_RECORD;
    const candidate = buildTrustRecordCandidate(schemaVersion, { asset, analysis, provenance, issuedAt });
    const parsed = parseAnyTrustRecord(candidate);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      await expect(computeAnchoredHash(parsed.record)).resolves.toBe(GOLDEN_DTR1_HASH);
    }
  });
});
