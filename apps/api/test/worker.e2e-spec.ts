import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PgBossService } from "../src/modules/worker/pgboss.service";
import { isDatabaseAvailable } from "./utils/db-availability";

const dbAvailable = await isDatabaseAvailable();

// D7: pg-boss runs on the same PostgreSQL instance as the rest of the app
// (design.md), so this smoke test is gated the same way as the DB-backed
// auth e2e suite — skipped gracefully when no reachable Postgres is
// configured, rather than failing the run.
describe.skipIf(!dbAvailable)("Worker module pg-boss bootstrap (smoke test, PR1/task 1.4)", () => {
  let app: INestApplication;
  let pgBossService: PgBossService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    pgBossService = moduleRef.get(PgBossService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("boots pg-boss (via app.init()'s OnModuleInit) and enqueues+consumes a no-op job", async () => {
    const boss = pgBossService.getBoss();
    const queueName = `smoke-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await boss.createQueue(queueName);

    let processed = false;
    await boss.work(queueName, async () => {
      processed = true;
    });

    const jobId = await boss.send(queueName, { noop: true });
    expect(jobId).not.toBeNull();

    const deadline = Date.now() + 10_000;
    while (!processed && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(processed).toBe(true);

    await boss.offWork(queueName);
    await boss.deleteQueue(queueName);
  });
});
