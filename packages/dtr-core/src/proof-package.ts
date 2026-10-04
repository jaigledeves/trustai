/**
 * Public proof package, format `ancrux-proof-1` (ADR-016).
 *
 * A small JSON document that, together with the original file, lets anyone
 * check a dtr-2 anchor without trusting Ancrux: recompute coreHash from the
 * file, recompute anchorHash from the package, then read
 * `isAnchored(anchorHash)` on `anchor.contractAddress` at `anchor.chainId`.
 *
 * It deliberately carries no AI analysis, provenance or filename (INV-41):
 * `enrichmentHash` commits to them without revealing them. Strict schemas:
 * an unknown key is a different format, not an extension.
 */

import { z } from "zod";
import {
  DTR_SCHEMA_VERSION_V2,
  formatIssues,
  isoUtcInstantSchema,
  sha256HexSchema,
} from "./schema.js";
import { verifyDtr2Proof } from "./verify.js";

export const PROOF_PACKAGE_FORMAT_V1 = "ancrux-proof-1" as const;

export const ProofPackageV1Schema = z
  .object({
    format: z.literal(PROOF_PACKAGE_FORMAT_V1),
    trustRecordId: z.string().min(1),
    dtr: z
      .object({
        schemaVersion: z.literal(DTR_SCHEMA_VERSION_V2),
        issuedAt: isoUtcInstantSchema,
        coreHash: sha256HexSchema,
        enrichmentHash: sha256HexSchema,
        anchorHash: sha256HexSchema,
      })
      .strict(),
    algorithms: z
      .object({
        hash: z.literal("SHA-256"),
        canonicalization: z.literal("RFC 8785 (JCS)"),
      })
      .strict(),
    anchor: z
      .object({
        /** EIP-155 chain id. */
        chainId: z.number().int().positive(),
        network: z.string().min(1),
        contractAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "must be a 20-byte hex address"),
        /** Null when the hash was already anchored before Ancrux submitted it. */
        txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "must be a 32-byte hex hash").nullable(),
        /** Decimal string: block numbers can exceed Number.MAX_SAFE_INTEGER. */
        blockNumber: z.string().regex(/^\d+$/, "must be a decimal integer string").nullable(),
        blockTimestamp: isoUtcInstantSchema.nullable(),
      })
      .strict(),
  })
  .strict();

export type ProofPackageV1 = z.infer<typeof ProofPackageV1Schema>;

export type ProofPackageCheckResult =
  /** The file matches and the package is self-consistent: look `anchorHash` up on-chain. */
  | { status: "verified"; coreHash: string; anchorHash: string; anchor: ProofPackageV1["anchor"] }
  /** The file is not the one the package describes. */
  | { status: "core_mismatch"; expectedCoreHash: string; actualCoreHash: string }
  /** The declared anchorHash does not follow from the package's own fields. */
  | { status: "anchor_hash_mismatch"; declaredAnchorHash: string; computedAnchorHash: string }
  /** The package or the file facts are malformed. */
  | { status: "invalid_package"; issues: string[] };

/**
 * Checks a proof package against facts computed locally from the file
 * (sha256, mimeType, sizeBytes). Chain-agnostic, like `verifyDtr2Proof`,
 * which it reuses: the on-chain lookup stays the caller's job. Never throws.
 */
export async function verifyProofPackageAgainstFile(
  pkg: unknown,
  file: { sha256: string; mimeType: string; sizeBytes: number } | unknown,
): Promise<ProofPackageCheckResult> {
  const parsed = ProofPackageV1Schema.safeParse(pkg);
  if (!parsed.success) {
    return { status: "invalid_package", issues: formatIssues(parsed.error) };
  }

  const { anchorHash: declaredAnchorHash, ...proof } = parsed.data.dtr;
  const result = await verifyDtr2Proof(proof, file);
  if (result.status === "invalid_proof") {
    return { status: "invalid_package", issues: result.issues };
  }
  if (result.status === "core_mismatch") {
    return result;
  }
  if (result.anchorHash !== declaredAnchorHash) {
    return { status: "anchor_hash_mismatch", declaredAnchorHash, computedAnchorHash: result.anchorHash };
  }
  return {
    status: "verified",
    coreHash: result.coreHash,
    anchorHash: result.anchorHash,
    anchor: parsed.data.anchor,
  };
}
