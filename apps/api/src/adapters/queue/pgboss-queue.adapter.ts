import { Injectable } from "@nestjs/common";
import { PgBossService } from "../../modules/worker/pgboss.service";
import type { QueuePort, TransactionHandle } from "../../ports/queue.port";
import { toPgBossDb } from "./prisma-pgboss-db.adapter";

/**
 * `QueuePort` implementation backed by the shared `PgBoss` instance
 * (`PgBossService`). Depending on `PgBossService` (a thin lifecycle wrapper
 * over the raw `pg-boss` library, itself framework-agnostic beyond Nest's
 * `OnModuleInit`/`OnModuleDestroy` hooks) is a deliberate, pragmatic choice
 * over duplicating pg-boss connection setup here.
 */
@Injectable()
export class PgBossQueueAdapter implements QueuePort {
  constructor(private readonly pgBossService: PgBossService) {}

  async send(
    jobName: string,
    payload: Record<string, unknown>,
    tx?: TransactionHandle,
  ): Promise<string | null> {
    const boss = this.pgBossService.getBoss();
    return boss.send(jobName, payload, tx ? { db: toPgBossDb(tx) } : undefined);
  }
}
