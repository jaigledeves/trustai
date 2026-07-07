import { Inject, Injectable, Logger } from "@nestjs/common";
import { AnchorStatus } from "../../../domain/anchor.entity";
import {
  ANCHOR_REPOSITORY_PORT,
  type AnchorRepositoryPort,
} from "../../../ports/anchor-repository.port";
import { ANCHOR_PORT, type AnchorPort } from "../../../ports/anchor.port";
import {
  TRUST_RECORD_REPOSITORY_PORT,
  type TrustRecordRepositoryPort,
} from "../../../ports/trust-record-repository.port";

/** design.md "pg-boss Jobs" table. */
export const ANCHOR_DTR_QUEUE = "anchor-dtr";

export interface AnchorDtrJobPayload {
  trustRecordId: string;
  canonicalHash: string;
}

/**
 * pg-boss `anchor-dtr` job handler — submit-only (design.md's PR-slice
 * mapping: Phase 6 adds this handler, Phase 7 adds `ConfirmAnchorHandler`
 * for the confirmation-polling + ANCHORING->CERTIFIED transition). This
 * handler's job ends once the transaction is broadcast (or once
 * `AlreadyAnchored` is detected) — it never waits for mining
 * (blockchain-anchoring spec: "Submission is non-blocking").
 */
@Injectable()
export class AnchorDtrHandler {
  private readonly logger = new Logger(AnchorDtrHandler.name);

  constructor(
    @Inject(ANCHOR_PORT)
    private readonly anchorPort: AnchorPort,
    @Inject(TRUST_RECORD_REPOSITORY_PORT)
    private readonly trustRecordRepository: TrustRecordRepositoryPort,
    @Inject(ANCHOR_REPOSITORY_PORT)
    private readonly anchorRepository: AnchorRepositoryPort,
  ) {}

  async handle(payload: AnchorDtrJobPayload): Promise<void> {
    const trustRecord = await this.trustRecordRepository.findById(payload.trustRecordId);
    if (!trustRecord) {
      throw new Error(`TrustRecord not found: ${payload.trustRecordId}`);
    }
    if (!trustRecord.anchorId) {
      throw new Error(`TrustRecord ${payload.trustRecordId} has no linked Anchor`);
    }

    const result = await this.anchorPort.submitAnchor(payload.canonicalHash);

    if (result.alreadyAnchored) {
      // blockchain-anchoring spec: "AlreadyAnchored revert treated as
      // success" — the hash demonstrably already exists on-chain (e.g. a
      // prior worker restart re-submitted the same job — RNF-022
      // durability), so there is nothing left to confirm.
      await this.anchorRepository.updateSubmissionResult(trustRecord.anchorId, {
        txHash: null,
        status: AnchorStatus.CONFIRMED,
      });
      this.logger.log(
        `Hash already anchored on-chain for TrustRecord ${payload.trustRecordId} — treated as success`,
      );
      return;
    }

    await this.anchorRepository.updateSubmissionResult(trustRecord.anchorId, {
      txHash: result.txHash,
      status: AnchorStatus.PENDING,
    });
    this.logger.log(
      `Anchor tx submitted for TrustRecord ${payload.trustRecordId}: ${result.txHash}`,
    );
    // Phase 7's ConfirmAnchorHandler polls for confirmations and performs
    // the ANCHORING->CERTIFIED transition — deliberately out of scope here.
  }
}
