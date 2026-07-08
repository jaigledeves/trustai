import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InvalidTransitionError, TrustRecordState, TrustRecordStateMachine } from "../../domain/trust-record.entity";
import {
  TRUST_RECORD_REPOSITORY_PORT,
  type TrustRecordRepositoryPort,
} from "../../ports/trust-record-repository.port";

export interface DiscardDraftParams {
  organizationId: string;
  trustRecordId: string;
}

/**
 * dtr-lifecycle spec: "Discard from DRAFT does not consume quota" (INV-50).
 * There is no quota implementation yet (RF-053 out of scope per proposal),
 * so this use case is simply the DRAFT->DISCARDED state transition itself
 * — nothing to decrement, since DISCARDED records were never counted in
 * the first place.
 */
@Injectable()
export class DiscardDraftUseCase {
  constructor(
    @Inject(TRUST_RECORD_REPOSITORY_PORT)
    private readonly trustRecordRepository: TrustRecordRepositoryPort,
  ) {}

  async execute(params: DiscardDraftParams): Promise<void> {
    const trustRecord = await this.trustRecordRepository.findByIdForOrganization(
      params.organizationId,
      params.trustRecordId,
    );
    if (!trustRecord) {
      throw new NotFoundException("Trust record not found");
    }

    // Reuses the state machine's own transition validation — only
    // DRAFT->DISCARDED is ever allowed (CERTIFIED is fully immutable,
    // INV-23; every other state is likewise rejected).
    try {
      TrustRecordStateMachine.transition(trustRecord.state, TrustRecordState.DISCARDED);
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }

    await this.trustRecordRepository.discard(params.trustRecordId);
  }
}
