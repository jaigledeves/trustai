/**
 * dtr-2 hashing (ADR-015) and the version-aware anchored hash.
 *
 * All hashes are SHA-256 over the RFC 8785 canonical form, lowercase hex:
 *  - coreHash       = sha256(JCS(core))
 *  - enrichmentHash = sha256(JCS(enrichment))
 *  - anchorHash     = sha256(JCS({ schemaVersion, issuedAt, coreHash, enrichmentHash }))
 *
 * anchorHash is the value anchored on-chain for dtr-2. dtr-1 keeps anchoring
 * the canonical hash of the whole record (ADR-001), unchanged.
 */

import { canonicalize } from "./canonicalize.js";
import { computeCanonicalHash, sha256Hex } from "./hash.js";
import {
  DTR_SCHEMA_VERSION_V2,
  type Dtr2CoreAsset,
  type Dtr2Proof,
  type TrustRecord,
  type TrustRecordV2,
} from "./schema.js";

export interface Dtr2Hashes {
  coreHash: string;
  enrichmentHash: string;
  anchorHash: string;
}

/** coreHash from the file facts alone: no Ancrux data needed. */
export async function computeDtr2CoreHash(asset: Dtr2CoreAsset): Promise<string> {
  const core: TrustRecordV2["core"] = {
    asset: { sha256: asset.sha256, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes },
  };
  return sha256Hex(canonicalize(core));
}

/** anchorHash from the minimal proof: no AI text needed. */
export async function computeDtr2AnchorHash(proof: Dtr2Proof): Promise<string> {
  return sha256Hex(
    canonicalize({
      schemaVersion: DTR_SCHEMA_VERSION_V2,
      issuedAt: proof.issuedAt,
      coreHash: proof.coreHash,
      enrichmentHash: proof.enrichmentHash,
    }),
  );
}

/** Computes the three dtr-2 hashes of a parsed record. */
export async function computeDtr2Hashes(record: TrustRecordV2): Promise<Dtr2Hashes> {
  const coreHash = await computeDtr2CoreHash(record.core.asset);
  const enrichmentHash = await sha256Hex(canonicalize(record.enrichment));
  const anchorHash = await computeDtr2AnchorHash({
    schemaVersion: DTR_SCHEMA_VERSION_V2,
    issuedAt: record.issuedAt,
    coreHash,
    enrichmentHash,
  });
  return { coreHash, enrichmentHash, anchorHash };
}

/**
 * The hash that must exist on-chain for any supported record:
 * dtr-1 -> canonical hash of the whole record; dtr-2 -> anchorHash.
 */
export async function computeAnchoredHash(record: TrustRecord): Promise<string> {
  if (record.schemaVersion === DTR_SCHEMA_VERSION_V2) {
    return (await computeDtr2Hashes(record)).anchorHash;
  }
  return computeCanonicalHash(record);
}
