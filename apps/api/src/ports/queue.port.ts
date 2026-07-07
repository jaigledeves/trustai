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
}
