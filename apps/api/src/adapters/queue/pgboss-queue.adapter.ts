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

  async sendAfter(
    jobName: string,
    payload: Record<string, unknown>,
    delaySeconds: number,
  ): Promise<string | null> {
    const boss = this.pgBossService.getBoss();
    return boss.sendAfter(jobName, payload, null, delaySeconds);
  }

  async findLatestJobByTrustRecordId(
    queueName: string,
    trustRecordId: string,
  ): Promise<{ state: string; output: unknown } | null> {
    const db = this.pgBossService.getBoss().getDb();
    const schema = this.pgBossService.getSchema();
    // Table/column names come from pg-boss's own migration DDL, not user
    // input — safe to interpolate the schema name (developer-controlled
    // config, same trust level as PGBOSS_SCHEMA elsewhere in this app).
    const { rows } = await db.executeSql(
      `SELECT state, output FROM "${schema}".job WHERE name = $1 AND data->>'trustRecordId' = $2 ORDER BY created_on DESC LIMIT 1`,
      [queueName, trustRecordId],
    );
    const row = rows[0] as { state: string; output: unknown } | undefined;
    return row ? { state: row.state, output: row.output } : null;
  }
}
