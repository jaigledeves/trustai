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
});
