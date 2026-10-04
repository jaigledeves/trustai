import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  ANCHOR_REGISTRY_DEPLOYMENTS,
  DTR_SCHEMA_VERSION_V2,
  PROOF_PACKAGE_FORMAT_V1,
  ProofPackageV1Schema,
  computeDtr2Hashes,
  parseAnyTrustRecord,
  type ProofPackageV1,
} from "@trustai/dtr-core";
import type { Anchor } from "../../domain/anchor.entity";
import { TrustRecordState } from "../../domain/trust-record.entity";
import {
  TRUST_RECORD_REPOSITORY_PORT,
  type TrustRecordRepositoryPort,
} from "../../ports/trust-record-repository.port";
import { buildStoredRecordCandidate } from "./stored-record-candidate";

export type ProofPackageResult =
  | { status: "ok"; proof: ProofPackageV1 }
  /** No record with this id. */
  | { status: "not_found" }
  /** dtr-1: verified by the server only (phase C decision, ADR-016). */
  | { status: "legacy_record" }
  /** Not CERTIFIED yet, or no anchor row. */
  | { status: "not_anchored" }
  /**
   * A trustworthy proof cannot be produced: the record no longer matches its
   * certified hash, its anchor network is unknown, or the package fails its
   * own schema. Never served, whatever the cause.
   */
  | { status: "unavailable" };

type AnchorLocation = Pick<ProofPackageV1["anchor"], "chainId" | "contractAddress">;

/**
 * Public proof package (phase C, C3; ADR-016): the `ancrux-proof-1` JSON a
 * third party combines with the original file to verify a dtr-2 anchor
 * without trusting Ancrux.
 *
 * A separate use case rather than a `VerifyDocumentUseCase` method: it
 * renders no verdict, reads no chain and logs no verification attempt; it
 * only re-derives and publishes the hashes. It shares the record rebuild
 * (`buildStoredRecordCandidate`) and the integrity rule with it: the
 * recomputed anchorHash must equal the stored `canonicalHash` (INV-22), or
 * no package is served.
 *
 * The package carries hashes and anchor coordinates only, never the AI
 * analysis, provenance or filename (INV-41).
 */
@Injectable()
export class GetProofPackageUseCase {
  private readonly logger = new Logger(GetProofPackageUseCase.name);

  constructor(
    @Inject(TRUST_RECORD_REPOSITORY_PORT)
    private readonly trustRecordRepository: TrustRecordRepositoryPort,
  ) {}

  async execute(trustRecordId: string): Promise<ProofPackageResult> {
    const found = await this.trustRecordRepository.findByIdWithAssetAndAnchor(trustRecordId);
    if (!found) {
      return { status: "not_found" };
    }
    const { trustRecord, anchor } = found;
    if (trustRecord.schemaVersion !== DTR_SCHEMA_VERSION_V2) {
      return { status: "legacy_record" };
    }
    if (trustRecord.state !== TrustRecordState.CERTIFIED || !anchor) {
      return { status: "not_anchored" };
    }

    const parsed = parseAnyTrustRecord(buildStoredRecordCandidate(found));
    if (!parsed.ok || parsed.record.schemaVersion !== DTR_SCHEMA_VERSION_V2) {
      return this.refuse(trustRecord.id, "its stored columns no longer form a valid dtr-2 record");
    }
    const hashes = await computeDtr2Hashes(parsed.record);
    if (hashes.anchorHash !== trustRecord.canonicalHash) {
      return this.refuse(trustRecord.id, "it no longer matches its certified canonicalHash");
    }

    const location = this.resolveAnchorLocation(anchor);
    if (!location) {
      return this.refuse(trustRecord.id, `its anchor network "${anchor.network}" has no known deployment`);
    }

    const proof = ProofPackageV1Schema.safeParse({
      format: PROOF_PACKAGE_FORMAT_V1,
      trustRecordId: trustRecord.id,
      dtr: {
        schemaVersion: DTR_SCHEMA_VERSION_V2,
        issuedAt: parsed.record.issuedAt,
        coreHash: hashes.coreHash,
        enrichmentHash: hashes.enrichmentHash,
        anchorHash: hashes.anchorHash,
      },
      algorithms: { hash: "SHA-256", canonicalization: "RFC 8785 (JCS)" },
      anchor: {
        ...location,
        network: anchor.network,
        txHash: anchor.txHash,
        blockNumber: anchor.blockNumber === null ? null : anchor.blockNumber.toString(),
        blockTimestamp: anchor.blockTimestamp?.toISOString() ?? null,
      },
    });
    if (!proof.success) {
      return this.refuse(trustRecord.id, "its stored anchor data does not form a valid proof package");
    }
    return { status: "ok", proof: proof.data };
  }

  /**
   * Stored chain id and contract (C1) when both exist. Anchors created
   * before C1 have neither; they fall back to the known deployment for
   * their network, provided it does not contradict a stored chain id.
   */
  private resolveAnchorLocation(anchor: Anchor): AnchorLocation | null {
    if (anchor.chainId !== null && anchor.contractAddress !== null) {
      return { chainId: anchor.chainId, contractAddress: anchor.contractAddress };
    }
    const deployment = ANCHOR_REGISTRY_DEPLOYMENTS.find(
      (candidate) =>
        candidate.network === anchor.network &&
        (anchor.chainId === null || candidate.chainId === anchor.chainId),
    );
    if (!deployment) {
      return null;
    }
    return {
      chainId: deployment.chainId,
      contractAddress: anchor.contractAddress ?? deployment.address,
    };
  }

  private refuse(trustRecordId: string, reason: string): ProofPackageResult {
    this.logger.warn(`Trust record ${trustRecordId}: proof package refused because ${reason}`);
    return { status: "unavailable" };
  }
}
