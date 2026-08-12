import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../src/adapters/prisma/prisma.service";
import { AppModule } from "../src/app.module";

// S-HEALTH-1: GET /health must succeed with no credentials and without
// depending on database connectivity — it's a liveness, not readiness,
// check. AuthModule (imported by AppModule) provides PrismaService, whose
// onModuleInit() calls $connect(); we override it with a no-op stub so this
// spec never requires a running Postgres instance.
describe("Health E2E (S-HEALTH-1)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: async () => undefined,
        onModuleDestroy: async () => undefined,
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("GET /health returns 200 with status ok and a version", async () => {
    const response = await request(app.getHttpServer()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok" });
    expect(typeof response.body.version).toBe("string");
  });

  // ADR-012 / spec "Health Check Exempt From Throttling". Uses its OWN app
  // instance with a tiny THROTTLE_LIMIT (2, well below the default 100) so
  // this test proves the exemption fast, without depending on the shared
  // `app`'s throttle bucket state from the test above.
  it("S-HEALTH-2: GET /health is exempt — calls far exceeding THROTTLE_LIMIT are never throttled", async () => {
    const previousLimit = process.env["THROTTLE_LIMIT"];
    const previousTtl = process.env["THROTTLE_TTL_SECONDS"];
    process.env["THROTTLE_LIMIT"] = "2";
    process.env["THROTTLE_TTL_SECONDS"] = "60";

    let throttledApp: INestApplication | undefined;
    try {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue({
          onModuleInit: async () => undefined,
          onModuleDestroy: async () => undefined,
        })
        .compile();
      throttledApp = moduleRef.createNestApplication();
      await throttledApp.init();

      // 5 calls comfortably exceeds THROTTLE_LIMIT=2 — none may be 429.
      for (let i = 0; i < 5; i++) {
        const res = await request(throttledApp.getHttpServer()).get("/health");
        expect(res.status).toBe(200);
      }
    } finally {
      await throttledApp?.close();
      if (previousLimit === undefined) {
        delete process.env["THROTTLE_LIMIT"];
      } else {
        process.env["THROTTLE_LIMIT"] = previousLimit;
      }
      if (previousTtl === undefined) {
        delete process.env["THROTTLE_TTL_SECONDS"];
      } else {
        process.env["THROTTLE_TTL_SECONDS"] = previousTtl;
      }
    }
  });
});
