import type { Db as PgBossDb } from "pg-boss";

export interface PrismaTransactionLike {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

/**
 * Hand-rolled pg-boss `IDatabase` wrapper over a Prisma transaction client
 * (`prisma.$transaction(async (tx) => ...)`). Passing the result as the
 * `db` option to `boss.send(...)` makes the enqueue atomic with whatever
 * else the same transaction writes — if the transaction rolls back, the
 * job is never created; if it commits, the job is created together with
 * the rest of the write.
 *
 * pg-boss's own `fromPrisma()` adapter does the same thing but its docs
 * state it "Requires Prisma v7+ with `@prisma/adapter-pg`". This project
 * stays on Prisma v6 — see README.md "Spike findings (Phase 0 / task 0.1
 * — certification-flow)" for the full risk comparison and why this
 * ~10-line wrapper was chosen over bumping Prisma.
 */
export function toPgBossDb(tx: PrismaTransactionLike): PgBossDb {
  return {
    async executeSql(text: string, values?: unknown[]): Promise<{ rows: unknown[] }> {
      const rows = await tx.$queryRawUnsafe(text, ...(values ?? []));
      return { rows: Array.isArray(rows) ? rows : [] };
    },
  };
}
