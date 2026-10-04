import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { isDatabaseAvailable } from "./utils/db-availability";

const dbAvailable = await isDatabaseAvailable();

const WRONG_PASSWORD = { password: "not-the-password" };

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

/**
 * Each test boots its OWN app so the in-memory throttler storage starts
 * empty and the env overrides below apply only to that instance. Limits are
 * resolved per request (AUTH_THROTTLE_LIMIT) or at module init
 * (THROTTLE_LIMIT), so they are set before the app is created.
 */
async function bootApp(env: Record<string, string>): Promise<INestApplication> {
  Object.assign(process.env, env);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

describe.skipIf(!dbAvailable)("Auth throttling E2E (A5)", () => {
  const touchedKeys = ["AUTH_THROTTLE_LIMIT", "THROTTLE_LIMIT", "TRUSTED_PROXY_SECRET"] as const;
  const saved = Object.fromEntries(touchedKeys.map((key) => [key, process.env[key]]));
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    for (const key of touchedKeys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("S-AUTH-19: login is limited per account; another account keeps its own bucket", async () => {
    app = await bootApp({ AUTH_THROTTLE_LIMIT: "3", THROTTLE_LIMIT: "1000" });
    const victim = uniqueEmail("throttle-victim");

    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: victim, ...WRONG_PASSWORD });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: victim.toUpperCase(), ...WRONG_PASSWORD });
    expect(blocked.status).toBe(429);

    const other = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: uniqueEmail("throttle-other"), ...WRONG_PASSWORD });
    expect(other.status).toBe(401);
  });

  it("S-AUTH-20: the global per-IP limit uses the forwarded client IP only with the trusted proxy secret", async () => {
    app = await bootApp({
      AUTH_THROTTLE_LIMIT: "1000",
      THROTTLE_LIMIT: "2",
      TRUSTED_PROXY_SECRET: "e2e-proxy-secret",
    });
    const login = (clientIp: string, secret: string) =>
      request(app!.getHttpServer())
        .post("/auth/login")
        .set("x-proxy-secret", secret)
        .set("x-client-ip", clientIp)
        .send({ email: uniqueEmail("throttle-ip"), ...WRONG_PASSWORD });

    expect((await login("203.0.113.10", "e2e-proxy-secret")).status).toBe(401);
    expect((await login("203.0.113.10", "e2e-proxy-secret")).status).toBe(401);
    expect((await login("203.0.113.10", "e2e-proxy-secret")).status).toBe(429);

    // A different forwarded client IP has its own bucket.
    expect((await login("203.0.113.20", "e2e-proxy-secret")).status).toBe(401);

    // A wrong secret is ignored: the request is keyed by the connection IP,
    // whose bucket is still empty in this app instance.
    expect((await login("203.0.113.10", "wrong-secret")).status).toBe(401);
  });
});
