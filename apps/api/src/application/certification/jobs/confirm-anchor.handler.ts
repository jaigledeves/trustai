import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AnchorStatus } from "../../../domain/anchor.entity";
import {
  InvalidTransitionError,
  TrustRecordState,
  TrustRecordStateMachine,
} from "../../../domain/trust-record.entity";
import {
  ANCHOR_REPOSITORY_PORT,
  type AnchorRepositoryPort,
} from "../../../ports/anchor-repository.port";
import { ANCHOR_PORT, type AnchorPort, type ConfirmationStatus } from "../../../ports/anchor.port";
import { QUEUE_PORT, type QueuePort } from "../../../ports/queue.port";
import {
  TRUST_RECORD_REPOSITORY_PORT,
  type TrustRecordRepositoryPort,
} from "../../../ports/trust-record-repository.port";
import { ANCHOR_DTR_QUEUE } from "./anchor-dtr.handler";
import { CONFIRM_ANCHOR_QUEUE } from "./queue-names";

export { CONFIRM_ANCHOR_QUEUE };

/** INV-32: a submitted anchor tx must reach this many confirmations before CERTIFIED. */
export const REQUIRED_CONFIRMATIONS = 2;

// design.md's starting guess, tunable via env without a code change. Real
// Base Sepolia block time is ~2s; anvil (Phase 6 integration test) mines
// near-instantly, so tests override this via CONFIRM_ANCHOR_POLL_INTERVAL_SECONDS.
const DEFAULT_POLL_INTERVAL_SECONDS = 15;
// design.md: "10-min window elapses (then -> FAILED, re-enqueue anchor-dtr)".
const DEFAULT_TIMEOUT_SECONDS = 10 * 60;

export interface ConfirmAnchorJobPayload {
  trustRecordId: string;
  txHash: string;
  anchorId: string;
  /** ISO 8601 UTC instant — when the FIRST confirm-anchor attempt for this submission started. */
  attemptStartedAt: string;
}

/**
 * pg-boss `confirm-anchor` job handler. Self-requeues via `sendAfter`
 * until either:
 * - `>= REQUIRED_CONFIRMATIONS` (INV-32): persists `txHash`, `blockTimestamp`,
 *   `blockNumber`, `chainId` and `contractAddress` on the `Anchor` row (CONFIRMED) and transitions ANCHORING->CERTIFIED
 *   (blockchain-anchoring spec: "Transaction confirmed").
 * - the receipt is `reverted` (e.g. `AlreadyAnchored` because a third party
 *   or a duplicate job anchored the same hash first — `anchor()` is
 *   permissionless): the reverted tx is never certified. If the hash IS
 *   anchored on-chain, the record is certified like `AnchorDtrHandler`'s
 *   "already anchored" path (no txHash, timestamp from `anchoredAt`);
 *   otherwise it follows the same FAILED + re-enqueue path as a timeout.
 * - the timeout window elapses: ANCHORING->FAILED (visible — "Failure
 *   state is visible throughout") then immediately FAILED->ANCHORING
 *   again with a fresh `anchor-dtr` job re-enqueued atomically (RF-033
 *   automatic retry; blockchain-anchoring spec: "Timeout triggers retry").
 *
 * A pure function of ports (`AnchorPort.getConfirmationStatus`, no direct
 * pg-boss/DB dependency) — unit-testable with a fake `PublicClient`-backed
 * port; verified for real against anvil in the Phase 7 golden-path e2e.
 */
@Injectable()
export class ConfirmAnchorHandler {
  private readonly logger = new Logger(ConfirmAnchorHandler.name);
  private readonly pollIntervalSeconds: number;
  private readonly timeoutMs: number;

  constructor(
    @Inject(ANCHOR_PORT)
    private readonly anchorPort: AnchorPort,
    @Inject(TRUST_RECORD_REPOSITORY_PORT)
    private readonly trustRecordRepository: TrustRecordRepositoryPort,
    @Inject(ANCHOR_REPOSITORY_PORT)
    private readonly anchorRepository: AnchorRepositoryPort,
    @Inject(QUEUE_PORT)
    private readonly queue: QueuePort,
    configService: ConfigService,
  ) {
    this.pollIntervalSeconds = Number(
      configService.get<string>(
        "CONFIRM_ANCHOR_POLL_INTERVAL_SECONDS",
        String(DEFAULT_POLL_INTERVAL_SECONDS),
      ),
    );
    this.timeoutMs =
      Number(
        configService.get<string>(
          "CONFIRM_ANCHOR_TIMEOUT_SECONDS",
          String(DEFAULT_TIMEOUT_SECONDS),
        ),
      ) * 1000;
  }

  async handle(payload: ConfirmAnchorJobPayload): Promise<void> {
    const status = await this.anchorPort.getConfirmationStatus(payload.txHash);

    if (status.confirmations >= REQUIRED_CONFIRMATIONS) {
      if (status.status === "reverted") {
        await this.handleRevertedTransaction(payload, status);
        return;
      }
      await this.certify(payload, status);
      return;
    }

    const elapsedMs = Date.now() - new Date(payload.attemptStartedAt).getTime();
    if (elapsedMs >= this.timeoutMs) {
      await this.retryAfterTimeout(payload);
      return;
    }

    // Not yet confirmed, not yet timed out — self-requeue the same payload
    // (attemptStartedAt is preserved so the timeout window is measured
    // from the FIRST attempt, not reset on every poll).
    await this.queue.sendAfter(
      CONFIRM_ANCHOR_QUEUE,
      { ...payload },
      this.pollIntervalSeconds,
    );
  }

  private async certify(payload: ConfirmAnchorJobPayload, status: ConfirmationStatus): Promise<void> {
    await this.anchorRepository.updateSubmissionResult(payload.anchorId, {
      txHash: payload.txHash,
      status: AnchorStatus.CONFIRMED,
      blockTimestamp: status.blockTimestamp,
      blockNumber: status.blockNumber,
      chainId: status.chainId,
      contractAddress: status.contractAddress,
    });

    await this.transitionToCertified(payload.trustRecordId);

    this.logger.log(
      `TrustRecord ${payload.trustRecordId} CERTIFIED after ${REQUIRED_CONFIRMATIONS}+ confirmations`,
    );
  }

  /**
   * A mined-but-reverted tx anchored nothing itself. Re-reads the registry:
   * if the hash is anchored anyway (someone else got there first), certify
   * exactly like `AnchorDtrHandler`'s "already anchored" branch — never
   * publishing the reverted txHash. Otherwise mark it FAILED and stop: the
   * tx was simulated before sending, so an on-chain revert that anchored
   * nothing is not transient, and retrying automatically would spend gas on
   * every attempt with no bound.
   */
  private async handleRevertedTransaction(
    payload: ConfirmAnchorJobPayload,
    status: ConfirmationStatus,
  ): Promise<void> {
    const trustRecord = await this.trustRecordRepository.findById(payload.trustRecordId);
    if (!trustRecord) {
      throw new Error(`TrustRecord not found: ${payload.trustRecordId}`);
    }
    if (!trustRecord.canonicalHash) {
      throw new Error(`TrustRecord ${payload.trustRecordId} has no canonicalHash to check`);
    }

    const existence = await this.anchorPort.isAnchored(trustRecord.canonicalHash);
    if (!existence.anchored) {
      try {
        TrustRecordStateMachine.transition(trustRecord.state, TrustRecordState.FAILED);
      } catch (err) {
        if (err instanceof InvalidTransitionError) {
          throw new Error(`Cannot mark TrustRecord ${payload.trustRecordId} FAILED: ${err.message}`);
        }
        throw err;
      }
      await this.trustRecordRepository.markAnchoringFailed(payload.trustRecordId);
      this.logger.error(
        `TrustRecord ${payload.trustRecordId} anchor tx ${payload.txHash} reverted and the hash is not anchored — marked FAILED, not retried automatically`,
      );
      return;
    }

    await this.anchorRepository.updateSubmissionResult(payload.anchorId, {
      txHash: null,
      status: AnchorStatus.CONFIRMED,
      blockTimestamp: existence.blockTimestamp,
      blockNumber: null,
      chainId: status.chainId,
      contractAddress: status.contractAddress,
    });
    await this.transitionToCertified(payload.trustRecordId);

    this.logger.warn(
      `TrustRecord ${payload.trustRecordId} anchor tx ${payload.txHash} reverted, but the hash is already anchored on-chain — CERTIFIED without a txHash`,
    );
  }

  private async transitionToCertified(trustRecordId: string): Promise<void> {
    const trustRecord = await this.trustRecordRepository.findById(trustRecordId);
    if (!trustRecord) {
      throw new Error(`TrustRecord not found: ${trustRecordId}`);
    }

    try {
      TrustRecordStateMachine.transition(trustRecord.state, TrustRecordState.CERTIFIED);
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        throw new Error(`Cannot certify TrustRecord ${trustRecordId}: ${err.message}`);
      }
      throw err;
    }
    await this.trustRecordRepository.certify(trustRecordId);
  }

  private async retryAfterTimeout(payload: ConfirmAnchorJobPayload): Promise<void> {
    await this.retryAnchoring(payload, "anchor confirmation timed out");
    this.logger.warn(
      `TrustRecord ${payload.trustRecordId} anchor confirmation timed out after ${this.timeoutMs}ms — retrying`,
    );
  }

  /**
   * ANCHORING -> FAILED -> ANCHORING with a fresh `anchor-dtr` job (RF-033),
   * used when confirmation times out.
   */
  private async retryAnchoring(payload: ConfirmAnchorJobPayload, reason: string): Promise<void> {
    const trustRecord = await this.trustRecordRepository.findById(payload.trustRecordId);
    if (!trustRecord) {
      throw new Error(`TrustRecord not found: ${payload.trustRecordId}`);
    }
    if (!trustRecord.canonicalHash) {
      throw new Error(`TrustRecord ${payload.trustRecordId} has no canonicalHash to retry with`);
    }

    // ANCHORING -> FAILED: visible failure state (spec: "Failure state is
    // visible throughout" — not a silent stall).
    try {
      TrustRecordStateMachine.transition(trustRecord.state, TrustRecordState.FAILED);
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        throw new Error(
          `Cannot mark TrustRecord ${payload.trustRecordId} FAILED (${reason}): ${err.message}`,
        );
      }
      throw err;
    }
    await this.trustRecordRepository.markAnchoringFailed(payload.trustRecordId);

    // FAILED -> ANCHORING: automatic retry (RF-033), always a valid edge
    // from the state we just transitioned into. Re-enqueues a fresh
    // anchor-dtr job atomically with the state write (same transactional-
    // callback pattern as submitForAnchoring).
    TrustRecordStateMachine.transition(TrustRecordState.FAILED, TrustRecordState.ANCHORING);
    const canonicalHash = trustRecord.canonicalHash;
    await this.trustRecordRepository.retryAnchoring(payload.trustRecordId, async (tx) => {
      await this.queue.send(
        ANCHOR_DTR_QUEUE,
        { trustRecordId: payload.trustRecordId, canonicalHash },
        tx,
      );
    });
  }
}
