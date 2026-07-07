import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { AnalyzeDocumentHandler } from "../../application/certification/jobs/analyze-document.handler";
import { PgBossService } from "./pgboss.service";

/** design.md "pg-boss Jobs" table. */
export const ANALYZE_DOCUMENT_QUEUE = "analyze-document";

/**
 * Registers every pg-boss job handler against the started `PgBoss`
 * instance. Kept separate from `PgBossService` so the boot/lifecycle
 * concern (start/stop) stays independent of which handlers exist —
 * Phase 6/7 add `anchor-dtr`/`confirm-anchor` registrations here the same
 * way, without touching `PgBossService`.
 */
@Injectable()
export class JobRegistrationService implements OnModuleInit {
  private readonly logger = new Logger(JobRegistrationService.name);

  constructor(
    private readonly pgBossService: PgBossService,
    private readonly analyzeDocumentHandler: AnalyzeDocumentHandler,
  ) {}

  async onModuleInit(): Promise<void> {
    const boss = this.pgBossService.getBoss();

    // Retry policy per design.md's pg-boss Jobs table.
    await boss.createQueue(ANALYZE_DOCUMENT_QUEUE, {
      retryLimit: 3,
      retryBackoff: true,
      retryDelay: 30,
      expireInSeconds: 300,
    });

    await boss.work(ANALYZE_DOCUMENT_QUEUE, async ([job]) => {
      if (!job) {
        return;
      }
      await this.analyzeDocumentHandler.handle(
        job.data as Parameters<AnalyzeDocumentHandler["handle"]>[0],
      );
    });

    this.logger.log(`Registered worker for queue "${ANALYZE_DOCUMENT_QUEUE}"`);
  }
}
