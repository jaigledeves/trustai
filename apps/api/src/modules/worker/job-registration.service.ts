import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  ANALYZE_DOCUMENT_QUEUE,
  AnalyzeDocumentHandler,
} from "../../application/certification/jobs/analyze-document.handler";
import {
  ANCHOR_DTR_QUEUE,
  AnchorDtrHandler,
} from "../../application/certification/jobs/anchor-dtr.handler";
import { PgBossService } from "./pgboss.service";

/**
 * Registers every pg-boss job handler against the started `PgBoss`
 * instance. Kept separate from `PgBossService` so the boot/lifecycle
 * concern (start/stop) stays independent of which handlers exist —
 * Phase 7 adds `confirm-anchor` registration here the same way, without
 * touching `PgBossService`.
 */
@Injectable()
export class JobRegistrationService implements OnModuleInit {
  private readonly logger = new Logger(JobRegistrationService.name);

  constructor(
    private readonly pgBossService: PgBossService,
    private readonly analyzeDocumentHandler: AnalyzeDocumentHandler,
    private readonly anchorDtrHandler: AnchorDtrHandler,
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

    // Retry policy per design.md's pg-boss Jobs table.
    await boss.createQueue(ANCHOR_DTR_QUEUE, {
      retryLimit: 5,
      retryBackoff: true,
      retryDelay: 60,
      expireInSeconds: 600,
    });

    await boss.work(ANCHOR_DTR_QUEUE, async ([job]) => {
      if (!job) {
        return;
      }
      await this.anchorDtrHandler.handle(job.data as Parameters<AnchorDtrHandler["handle"]>[0]);
    });

    this.logger.log(`Registered worker for queue "${ANCHOR_DTR_QUEUE}"`);
  }
}
