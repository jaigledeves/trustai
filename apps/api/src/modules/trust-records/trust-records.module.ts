import { Module } from "@nestjs/common";
import { PrismaTrustRecordRepository } from "../../adapters/prisma/trust-record.repository";
import { PrismaService } from "../../adapters/prisma/prisma.service";
import { ConfirmReviewUseCase } from "../../application/certification/confirm-review.use-case";
import { DiscardDraftUseCase } from "../../application/certification/discard-draft.use-case";
import { TRUST_RECORD_REPOSITORY_PORT } from "../../ports/trust-record-repository.port";
import { AssetsModule } from "../assets/assets.module";
import { TrustRecordsController } from "./trust-records.controller";

@Module({
  // AssetsModule exports DIGITAL_ASSET_REPOSITORY_PORT — ConfirmReviewUseCase
  // needs it to fetch the asset (sha256/mimeType/sizeBytes/filename) for
  // canonical DTR assembly. PrismaService/TRUST_RECORD_REPOSITORY_PORT are
  // declared locally rather than imported from WorkerModule — mirrors the
  // existing convention (AssetsModule and WorkerModule each already
  // independently declare their own PrismaService provider).
  imports: [AssetsModule],
  controllers: [TrustRecordsController],
  providers: [
    PrismaService,
    ConfirmReviewUseCase,
    DiscardDraftUseCase,
    { provide: TRUST_RECORD_REPOSITORY_PORT, useClass: PrismaTrustRecordRepository },
  ],
})
export class TrustRecordsModule {}
