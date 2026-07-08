import { Injectable } from "@nestjs/common";
import type {
  RecordAttemptFields,
  VerificationAttemptRepositoryPort,
} from "../../ports/verification-attempt-repository.port";
import { PrismaService } from "./prisma.service";

/**
 * public-verification spec "Every Attempt Persisted" (RF-046). Plain
 * insert-only adapter — no domain entity/mapping needed, `record()`
 * returns `void` by design (callers never read the created row back).
 */
@Injectable()
export class PrismaVerificationAttemptRepository implements VerificationAttemptRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async record(fields: RecordAttemptFields): Promise<void> {
    await this.prisma.verificationAttempt.create({
      data: {
        trustRecordId: fields.trustRecordId,
        type: fields.type,
        verdict: fields.verdict,
        channel: fields.channel,
      },
    });
  }
}
