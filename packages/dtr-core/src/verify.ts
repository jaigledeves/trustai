/**
 * DTR verification (UC-02).
 *
 * This module is deliberately chain-agnostic: it validates the record and
 * the asset, and computes the canonical hash that MUST exist on-chain.
 * Looking that hash up (AnchorRegistry.anchoredAt) is the caller's job —
 * a browser, the API or a CLI hitting any public RPC node (RNF-032).
 */

import { computeCanonicalHash } from "./hash.js";
import { parseTrustRecord, type TrustRecordV1 } from "./schema.js";

export type VerificationResult =
  /** Record well-formed and the asset matches. Anchor check pending on caller. */
  | {
      status: "asset_verified";
      record: TrustRecordV1;
      /** The hash to look up on-chain (leaf or Merkle root member). */
      canonicalHash: string;
    }
  /** The supplied document is NOT the one this DTR describes (or was altered). */
  | {
      status: "asset_mismatch";
      record: TrustRecordV1;
      expectedSha256: string;
      actualSha256: string;
    }
  /** The DTR itself is malformed — nothing further can be trusted. */
  | { status: "invalid_record"; issues: string[] };

/**
 * Verifies an asset against a Trust Record.
 *
 * @param record        Untrusted DTR (parsed JSON).
 * @param assetSha256   Lowercase hex SHA-256 of the document being checked.
 */
export async function verifyAssetAgainstRecord(
  record: unknown,
  assetSha256: string,
): Promise<VerificationResult> {
  const parsed = parseTrustRecord(record);
  if (!parsed.ok) {
    return { status: "invalid_record", issues: parsed.issues };
  }

  const normalized = assetSha256.toLowerCase();
  if (parsed.record.asset.sha256 !== normalized) {
    return {
      status: "asset_mismatch",
      record: parsed.record,
      expectedSha256: parsed.record.asset.sha256,
      actualSha256: normalized,
    };
  }

  return {
    status: "asset_verified",
    record: parsed.record,
    canonicalHash: await computeCanonicalHash(parsed.record),
  };
}
