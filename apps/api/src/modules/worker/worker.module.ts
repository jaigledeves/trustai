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
import { QueueModule } from "../queue/queue.module";
import { JobRegistrationService } from "./job-registration.service";

@Module({
  // AssetsModule exports STORAGE_PORT/ENCRYPTION_PORT/DIGITAL_ASSET_REPOSITORY_PORT
  // — AnalyzeDocumentHandler reuses those exact adapters instead of a second
  // S3StorageAdapter/AesGcmAdapter construction site. PgBossService now
  // lives in QueueModule (shared with AssetsModule's QUEUE_PORT) — imported,
  // not re-declared, so there's exactly one PgBoss instance app-wide.
  imports: [ConfigModule, AssetsModule, QueueModule],
  providers: [
    JobRegistrationService,
    PrismaService,
    AnalyzeDocumentHandler,
    { provide: TRUST_RECORD_REPOSITORY_PORT, useClass: PrismaTrustRecordRepository },
    { provide: TEXT_EXTRACTION_PORT, useClass: UnpdfTextExtractionAdapter },
    // AI_ADAPTER env switch (openai|stub) lands in Phase 4 — stub only for now.
    { provide: AI_ANALYSIS_PORT, useClass: StubAiAnalysisAdapter },
  ],
  // Re-export the whole QueueModule (not just the PgBossService token) so
  // consumers of WorkerModule (e.g. worker.e2e-spec.ts's moduleRef.get)
  // can still resolve PgBossService — Nest requires re-exporting an
  // imported module's provider via the module reference itself.
  exports: [QueueModule],
})
export class WorkerModule {}
