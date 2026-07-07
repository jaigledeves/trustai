import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaTrustRecordRepository } from "../../adapters/prisma/trust-record.repository";
import { UnpdfTextExtractionAdapter } from "../../adapters/extraction/unpdf.adapter";
import { StubAiAnalysisAdapter } from "../../adapters/ai/stub.adapter";
import { PrismaService } from "../../adapters/prisma/prisma.service";
import { AnalyzeDocumentHandler } from "../../application/certification/jobs/analyze-document.handler";
import { AI_ANALYSIS_PORT } from "../../ports/ai-analysis.port";
import { TEXT_EXTRACTION_PORT } from "../../ports/text-extraction.port";
import { TRUST_RECORD_REPOSITORY_PORT } from "../../ports/trust-record-repository.port";
import { AssetsModule } from "../assets/assets.module";
import { JobRegistrationService } from "./job-registration.service";
import { PgBossService } from "./pgboss.service";

@Module({
  // AssetsModule exports STORAGE_PORT/ENCRYPTION_PORT/DIGITAL_ASSET_REPOSITORY_PORT
  // — AnalyzeDocumentHandler reuses those exact adapters instead of a second
  // S3StorageAdapter/AesGcmAdapter construction site.
  imports: [ConfigModule, AssetsModule],
  providers: [
    PgBossService,
    JobRegistrationService,
    PrismaService,
    AnalyzeDocumentHandler,
    { provide: TRUST_RECORD_REPOSITORY_PORT, useClass: PrismaTrustRecordRepository },
    { provide: TEXT_EXTRACTION_PORT, useClass: UnpdfTextExtractionAdapter },
    // AI_ADAPTER env switch (openai|stub) lands in Phase 4 — stub only for now.
    { provide: AI_ANALYSIS_PORT, useClass: StubAiAnalysisAdapter },
  ],
  exports: [PgBossService],
})
export class WorkerModule {}
