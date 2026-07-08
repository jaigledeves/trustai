import { describe, expect, it, vi } from "vitest";
import { toPgBossDb } from "./prisma-pgboss-db.adapter";

describe("toPgBossDb (pg-boss IDatabase wrapper over a Prisma transaction)", () => {
  it("delegates executeSql to the transaction's $queryRawUnsafe with spread values", async () => {
    const queryRawUnsafe = vi.fn().mockResolvedValue([{ id: "job-1" }]);
    const db = toPgBossDb({ $queryRawUnsafe: queryRawUnsafe });

    const result = await db.executeSql("select $1 as input", ["arg1"]);

    expect(queryRawUnsafe).toHaveBeenCalledWith("select $1 as input", "arg1");
    expect(result).toEqual({ rows: [{ id: "job-1" }] });
  });

  it("wraps a non-array result (e.g. an INSERT with no RETURNING) into an empty rows array", async () => {
    const queryRawUnsafe = vi.fn().mockResolvedValue(undefined);
    const db = toPgBossDb({ $queryRawUnsafe: queryRawUnsafe });

    const result = await db.executeSql("insert into foo default values");

    expect(result).toEqual({ rows: [] });
  });

  it("calls $queryRawUnsafe with no extra args when values is omitted", async () => {
    const queryRawUnsafe = vi.fn().mockResolvedValue([]);
    const db = toPgBossDb({ $queryRawUnsafe: queryRawUnsafe });

    await db.executeSql("select 1");

    expect(queryRawUnsafe).toHaveBeenCalledWith("select 1");
  });
});
