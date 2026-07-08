import { Inject, Injectable, Logger } from "@nestjs/common";
import { AnchorStatus } from "../../../domain/anchor.entity";
import { InvalidTransitionError, TrustRecordState, TrustRecordStateMachine } from "../../../domain/trust-record.entity";
import {
  ANCHOR_REPOSITORY_PORT,
  type AnchorRepositoryPort,
} from "../../../ports/anchor-repository.port";
import { ANCHOR_PORT, type AnchorPort } from "../../../ports/anchor.port";
import { QUEUE_PORT, type QueuePort } from "../../../ports/queue.port";
import {
  TRUST_RECORD_REPOSITORY_PORT,
  type TrustRecordRepositoryPort,
} from "../../../ports/trust-record-repository.port";
import { ANCHOR_DTR_QUEUE, CONFIRM_ANCHOR_QUEUE } from "./queue-names";

export { ANCHOR_DTR_QUEUE };

export interface AnchorDtrJobPayload {
  trustRecordId: string;
  canonicalHash: string;
}

/**
 * pg-boss `anchor-dtr` job handler. Two outcomes once `submitAnchor`
 * returns:
 *
 * - **Freshly submitted** (the common case): persists the tx as PENDING
 *   and enqueues `confirm-anchor` to poll for confirmations
 *   (`ConfirmAnchorHandler` owns the ANCHORING->CERTIFIED transition from
 *   there — INV-32).
 * - **`AlreadyAnchored`** (blockchain-anchoring spec: "treated as
 *   success"): there is nothing to poll for — the hash is already a
 *   known-confirmed fact on-chain (e.g. a prior worker restart already
 *   anchored it — RNF-022 durability) — so this handler certifies the
 *   record directly, immediately, without ever touching `confirm-anchor`.
 *
 * This handler's own work ends once the transaction is broadcast (or
 * AlreadyAnchored/certify is handled) — it never waits for mining itself
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
    @Inject(QUEUE_PORT)
    private readonly queue: QueuePort,
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
      await this.anchorRepository.updateSubmissionResult(trustRecord.anchorId, {
        txHash: null,
        status: AnchorStatus.CONFIRMED,
        blockTimestamp: result.anchoredAtBlockTimestamp,
      });

      // Reuses the state machine's own transition validation — no
      // confirm-anchor polling needed, this is already a known-true fact.
      try {
        TrustRecordStateMachine.transition(trustRecord.state, TrustRecordState.CERTIFIED);
      } catch (err) {
        if (err instanceof InvalidTransitionError) {
          throw new Error(
            `Cannot certify TrustRecord ${payload.trustRecordId} (already anchored on-chain): ${err.message}`,
          );
        }
        throw err;
      }
      await this.trustRecordRepository.certify(payload.trustRecordId);

      this.logger.log(
        `TrustRecord ${payload.trustRecordId} CERTIFIED immediately — hash was already anchored on-chain`,
      );
      return;
    }

    await this.anchorRepository.updateSubmissionResult(trustRecord.anchorId, {
      txHash: result.txHash,
      status: AnchorStatus.PENDING,
    });

    await this.queue.send(CONFIRM_ANCHOR_QUEUE, {
      trustRecordId: payload.trustRecordId,
      txHash: result.txHash,
      anchorId: trustRecord.anchorId,
      attemptStartedAt: new Date().toISOString(),
    });

    this.logger.log(
      `Anchor tx submitted for TrustRecord ${payload.trustRecordId}: ${result.txHash}; enqueued confirm-anchor`,
    );
  }
}
