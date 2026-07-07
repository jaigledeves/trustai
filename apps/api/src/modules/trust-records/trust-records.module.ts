import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaAnchorRepository } from "../../adapters/prisma/anchor.repository";
import { PrismaTrustRecordRepository } from "../../adapters/prisma/trust-record.repository";
import { PrismaService } from "../../adapters/prisma/prisma.service";
import { ConfirmReviewUseCase } from "../../application/certification/confirm-review.use-case";
import { DiscardDraftUseCase } from "../../application/certification/discard-draft.use-case";
import { SubmitForAnchoringUseCase } from "../../application/certification/submit-for-anchoring.use-case";
import { ANCHOR_REPOSITORY_PORT } from "../../ports/anchor-repository.port";
import { TRUST_RECORD_REPOSITORY_PORT } from "../../ports/trust-record-repository.port";
import { AssetsModule } from "../assets/assets.module";
import { QueueModule } from "../queue/queue.module";
import { TrustRecordsController } from "./trust-records.controller";

@Module({
  // AssetsModule exports DIGITAL_ASSET_REPOSITORY_PORT — ConfirmReviewUseCase
  // needs it to fetch the asset (sha256/mimeType/sizeBytes/filename) for
  // canonical DTR assembly. QueueModule exports QUEUE_PORT — SubmitForAnchoringUseCase
  // enqueues anchor-dtr atomically through it. PrismaService/TRUST_RECORD_REPOSITORY_PORT
  // are declared locally rather than imported from WorkerModule — mirrors the
  // existing convention (AssetsModule and WorkerModule each already
  // independently declare their own PrismaService provider).
  imports: [ConfigModule, AssetsModule, QueueModule],
  controllers: [TrustRecordsController],
  providers: [
    PrismaService,
    ConfirmReviewUseCase,
    DiscardDraftUseCase,
    SubmitForAnchoringUseCase,
    { provide: TRUST_RECORD_REPOSITORY_PORT, useClass: PrismaTrustRecordRepository },
    { provide: ANCHOR_REPOSITORY_PORT, useClass: PrismaAnchorRepository },
  ],
})
export class TrustRecordsModule {}
