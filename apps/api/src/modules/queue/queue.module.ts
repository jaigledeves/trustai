import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PgBossQueueAdapter } from "../../adapters/queue/pgboss-queue.adapter";
import { QUEUE_PORT } from "../../ports/queue.port";
import { PgBossService } from "../worker/pgboss.service";

/**
 * Owns the single shared `PgBossService` instance + the `QueuePort`
 * adapter that wraps it. Extracted into its own leaf module (no
 * dependency on `AssetsModule`/`WorkerModule`) so both can import it
 * without creating a module cycle: `AssetsModule` needs `QUEUE_PORT` for
 * `UploadAssetUseCase` (the producer); `WorkerModule` needs `PgBossService`
 * for `JobRegistrationService` (the consumer) — and `WorkerModule` already
 * imports `AssetsModule` to reuse its storage/encryption ports, so
 * `AssetsModule` importing `WorkerModule` back would be circular.
 */
@Module({
  imports: [ConfigModule],
  providers: [PgBossService, { provide: QUEUE_PORT, useClass: PgBossQueueAdapter }],
  exports: [PgBossService, QUEUE_PORT],
})
export class QueueModule {}
