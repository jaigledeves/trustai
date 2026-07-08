import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  InvalidTransitionError,
  TrustRecordState,
  TrustRecordStateMachine,
} from "../../domain/trust-record.entity";
import { ANCHOR_DTR_QUEUE } from "./jobs/anchor-dtr.handler";
import {
  ANCHOR_REPOSITORY_PORT,
  type AnchorRepositoryPort,
} from "../../ports/anchor-repository.port";
import { QUEUE_PORT, type QueuePort } from "../../ports/queue.port";
import {
  TRUST_RECORD_REPOSITORY_PORT,
  type TrustRecordRepositoryPort,
} from "../../ports/trust-record-repository.port";

export interface SubmitForAnchoringParams {
  organizationId: string;
  trustRecordId: string;
}

export interface SubmitForAnchoringResult {
  trustRecordId: string;
  state: "ANCHORING";
}

/**
 * blockchain-anchoring spec: "Async Submission on READY->ANCHORING" —
 * enqueues the `anchor-dtr` job and transitions the record to ANCHORING
 * immediately, without waiting for the chain (RF-032, RNF-022). Mirrors
 * `ConfirmReviewUseCase`'s conventions: NestJS HTTP exceptions thrown
 * directly, `TrustRecordStateMachine` reused (its errors caught and
 * rewrapped), org-scoped lookup via `findByIdForOrganization`.
 */
@Injectable()
export class SubmitForAnchoringUseCase {
  constructor(
    @Inject(TRUST_RECORD_REPOSITORY_PORT)
    private readonly trustRecordRepository: TrustRecordRepositoryPort,
    @Inject(ANCHOR_REPOSITORY_PORT)
    private readonly anchorRepository: AnchorRepositoryPort,
    @Inject(QUEUE_PORT)
    private readonly queue: QueuePort,
    private readonly configService: ConfigService,
  ) {}

  async execute(params: SubmitForAnchoringParams): Promise<SubmitForAnchoringResult> {
    const trustRecord = await this.trustRecordRepository.findByIdForOrganization(
      params.organizationId,
      params.trustRecordId,
    );
    if (!trustRecord) {
      throw new NotFoundException("Trust record not found");
    }

    // Defense-in-depth: a READY record should always have canonicalHash
    // set (Phase 5's ConfirmReviewUseCase guarantees this), but never
    // submit a hash-less anchor job.
    if (!trustRecord.canonicalHash) {
      throw new ConflictException(
        "Cannot submit for anchoring: canonicalHash is not set yet (confirm review first)",
      );
    }

    // Reuses the state machine's own transition validation — only
    // READY->ANCHORING is ever allowed here (DRAFT, already-ANCHORING,
    // CERTIFIED, FAILED-without-retry, and DISCARDED are all rejected).
    try {
      TrustRecordStateMachine.transition(trustRecord.state, TrustRecordState.ANCHORING);
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }

    const anchor = await this.anchorRepository.create({
      chain: "base",
      network: this.configService.get<string>("CHAIN_NETWORK", "base-sepolia"),
    });

    const canonicalHash = trustRecord.canonicalHash;
    await this.trustRecordRepository.submitForAnchoring(
      params.trustRecordId,
      anchor.id,
      // Runs inside the repository's own DB transaction — the enqueue
      // commits/rolls back together with the ANCHORING state write
      // (design.md "Transactional enqueue" decision).
      async (tx) => {
        await this.queue.send(
          ANCHOR_DTR_QUEUE,
          { trustRecordId: params.trustRecordId, canonicalHash },
          tx,
        );
      },
    );

    return { trustRecordId: params.trustRecordId, state: "ANCHORING" };
  }
}
