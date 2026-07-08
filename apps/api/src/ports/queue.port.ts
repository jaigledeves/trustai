export const QUEUE_PORT = Symbol("QueuePort");

/**
 * Minimal structural shape of a Prisma transaction client — just enough
 * for pg-boss's `IDatabase` wrapper (`toPgBossDb`, see
 * `adapters/queue/prisma-pgboss-db.adapter.ts`). Defined here, not in the
 * adapter, so ports never depend on adapters; the adapter imports this
 * type from the port instead.
 */
export interface TransactionHandle {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

/**
 * design.md "Transactional enqueue" decision: `send()` accepts an optional
 * `tx`. When provided, the enqueue happens atomically inside that same
 * database transaction — commits/rolls back together with whatever else
 * the transaction writes. See README.md's Phase 0 spike findings for why
 * this doesn't require bumping Prisma to v7 (`toPgBossDb` is a ~10-line
 * hand-rolled wrapper over Prisma v6's `$transaction` client).
 */
export interface QueuePort {
  send(
    jobName: string,
    payload: Record<string, unknown>,
    tx?: TransactionHandle,
  ): Promise<string | null>;

  /**
   * Schedules a job to become available after `delaySeconds` — used by
   * `ConfirmAnchorHandler` to self-requeue its own confirmation poll
   * (design.md: "Self-requeues via sendAfter(15s) until 2 confirmations
   * or a 10-min window elapses").
   */
  sendAfter(
    jobName: string,
    payload: Record<string, unknown>,
    delaySeconds: number,
  ): Promise<string | null>;

  /**
   * Phase 7: reads the latest job matching `queueName` whose payload's
   * `trustRecordId` field equals `trustRecordId` — backs the
   * analysis-failure-visibility read on `GET /trust-records/:id`
   * (design.md "Analysis-failure visibility" decision: pg-boss's own job
   * history is the durable source of truth for job outcomes, no new
   * TrustRecord column). `null` if no such job exists yet.
   */
  findLatestJobByTrustRecordId(
    queueName: string,
    trustRecordId: string,
  ): Promise<{ state: string; output: unknown } | null>;
}
