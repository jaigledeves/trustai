import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PrismaTrustRecordRepository } from "../../adapters/prisma/trust-record.repository";
import { UnpdfTextExtractionAdapter } from "../../adapters/extraction/unpdf.adapter";
import { OpenAiAnalysisAdapter } from "../../adapters/ai/openai.adapter";
import { StubAiAnalysisAdapter } from "../../adapters/ai/stub.adapter";
import { PrismaService } from "../../adapters/prisma/prisma.service";
import { AnalyzeDocumentHandler } from "../../application/certification/jobs/analyze-document.handler";
import { AI_ANALYSIS_PORT, type AiAnalysisPort } from "../../ports/ai-analysis.port";
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
    // AI_ADAPTER env switch (openai|stub) — mirrors AssetsModule's
    // STORAGE_PORT useFactory pattern. Defaults to "stub" so environments
    // without OPENAI_API_KEY (like this one) keep working out of the box.
    {
      provide: AI_ANALYSIS_PORT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): AiAnalysisPort => {
        const adapter = configService.get<string>("AI_ADAPTER", "stub");
        if (adapter === "openai") {
          const apiKey = configService.get<string>("OPENAI_API_KEY", "");
          const model = configService.get<string>("OPENAI_MODEL");
          return new OpenAiAnalysisAdapter(model ? { apiKey, model } : { apiKey });
        }
        return new StubAiAnalysisAdapter();
      },
    },
  ],
  // Re-export the whole QueueModule (not just the PgBossService token) so
  // consumers of WorkerModule (e.g. worker.e2e-spec.ts's moduleRef.get)
  // can still resolve PgBossService — Nest requires re-exporting an
  // imported module's provider via the module reference itself.
  exports: [QueueModule],
})
export class WorkerModule {}
