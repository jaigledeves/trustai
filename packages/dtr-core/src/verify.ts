/**
 * DTR verification (UC-02).
 *
 * This module is deliberately chain-agnostic: it validates the record and
 * the asset, and computes the canonical hash that MUST exist on-chain.
 * Looking that hash up (AnchorRegistry.anchoredAt) is the caller's job —
 * a browser, the API or a CLI hitting any public RPC node (RNF-032).
 */

import { computeAnchoredHash, computeDtr2AnchorHash, computeDtr2CoreHash } from "./dtr2-hash.js";
import {
  DTR_SCHEMA_VERSION_V2,
  Dtr2CoreAssetSchema,
  Dtr2ProofSchema,
  formatIssues,
  parseAnyTrustRecord,
  type TrustRecord,
} from "./schema.js";

export type VerificationResult =
  /** Record well-formed and the asset matches. Anchor check pending on caller. */
  | {
      status: "asset_verified";
      record: TrustRecord;
      /**
       * The hash to look up on-chain: the dtr-1 canonical hash, or the
       * dtr-2 anchorHash (ADR-015).
       */
      canonicalHash: string;
    }
  /** The supplied document is NOT the one this DTR describes (or was altered). */
  | {
      status: "asset_mismatch";
      record: TrustRecord;
      expectedSha256: string;
      actualSha256: string;
    }
  /** The DTR itself is malformed — nothing further can be trusted. */
  | { status: "invalid_record"; issues: string[] };

/**
 * Verifies an asset against a Trust Record of any supported version
 * (dtr-1 reads `asset.sha256`, dtr-2 reads `core.asset.sha256`).
 *
 * @param record        Untrusted DTR (parsed JSON).
 * @param assetSha256   Lowercase hex SHA-256 of the document being checked.
 */
export async function verifyAssetAgainstRecord(
  record: unknown,
  assetSha256: string,
): Promise<VerificationResult> {
  const parsed = parseAnyTrustRecord(record);
  if (!parsed.ok) {
    return { status: "invalid_record", issues: parsed.issues };
  }

  const expectedSha256 =
    parsed.record.schemaVersion === DTR_SCHEMA_VERSION_V2
      ? parsed.record.core.asset.sha256
      : parsed.record.asset.sha256;
  const normalized = assetSha256.toLowerCase();
  if (expectedSha256 !== normalized) {
    return {
      status: "asset_mismatch",
      record: parsed.record,
      expectedSha256,
      actualSha256: normalized,
    };
  }

  return {
    status: "asset_verified",
    record: parsed.record,
    canonicalHash: await computeAnchoredHash(parsed.record),
  };
}

export type Dtr2ProofResult =
  /** The file matches the proof's core. Look `anchorHash` up on-chain. */
  | { status: "core_verified"; coreHash: string; anchorHash: string }
  /** The file is not the one the proof describes. */
  | { status: "core_mismatch"; expectedCoreHash: string; actualCoreHash: string }
  /** The proof or the file facts are malformed. */
  | { status: "invalid_proof"; issues: string[] };

/**
 * Minimal dtr-2 proof check (ADR-015): recomputes coreHash from the file
 * facts and anchorHash from the proof, without the AI enrichment.
 *
 * @param proof  Untrusted `{ schemaVersion, issuedAt, coreHash, enrichmentHash }`.
 * @param file   Facts computed locally from the file: sha256, mimeType, sizeBytes.
 *               Treated as untrusted: malformed input yields `invalid_proof`,
 *               never a thrown error.
 */
export async function verifyDtr2Proof(
  proof: unknown,
  file: { sha256: string; mimeType: string; sizeBytes: number } | unknown,
): Promise<Dtr2ProofResult> {
  const parsedProof = Dtr2ProofSchema.safeParse(proof);
  const parsedFile = Dtr2CoreAssetSchema.safeParse(normalizeFileFacts(file));
  if (!parsedProof.success || !parsedFile.success) {
    const issues = [
      ...(parsedProof.success ? [] : formatIssues(parsedProof.error).map((i) => `proof.${i}`)),
      ...(parsedFile.success ? [] : formatIssues(parsedFile.error).map((i) => `file.${i}`)),
    ];
    return { status: "invalid_proof", issues };
  }

  const coreHash = await computeDtr2CoreHash(parsedFile.data);
  if (coreHash !== parsedProof.data.coreHash) {
    return {
      status: "core_mismatch",
      expectedCoreHash: parsedProof.data.coreHash,
      actualCoreHash: coreHash,
    };
  }

  return { status: "core_verified", coreHash, anchorHash: await computeDtr2AnchorHash(parsedProof.data) };
}

/** Lowercases a string sha256 so uppercase hex from a caller still matches. */
function normalizeFileFacts(file: unknown): unknown {
  if (typeof file !== "object" || file === null) return file;
  const facts = file as Record<string, unknown>;
  const sha256 = facts["sha256"];
  return typeof sha256 === "string" ? { ...facts, sha256: sha256.toLowerCase() } : facts;
}
