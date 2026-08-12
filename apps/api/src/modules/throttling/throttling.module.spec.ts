import type { ApplicationConfig } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { ThrottlingModule } from "./throttling.module";
import { UserAwareThrottlerGuard } from "./user-aware-throttler.guard";

/**
 * Integration test (design.md Testing Strategy: "ThrottlingModule wiring").
 * Only `.compile()`s the module — deliberately never calls
 * `createNestApplication()`/`app.init()`, so `AuthModule`'s `PrismaService`
 * (imported transitively for `JwtService`) never runs its `onModuleInit`
 * `$connect()` — this stays a pure DI-wiring check, no real Postgres needed.
 */
describe("ThrottlingModule", () => {
  it("registers UserAwareThrottlerGuard as the global APP_GUARD", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), ThrottlingModule],
    }).compile();

    // Nest's scanner rewrites `{ provide: APP_GUARD, ... }` to a randomized
    // internal token at scan time (never resolvable via the literal
    // `APP_GUARD` string through `.get()`); the instantiated guard is only
    // reachable via `ApplicationConfig.getGlobalGuards()`, which is exactly
    // what Nest's own bootstrap consults to apply it globally.
    const applicationConfig = (moduleRef as unknown as { applicationConfig: ApplicationConfig })
      .applicationConfig;
    const globalGuards = applicationConfig.getGlobalGuards();

    expect(globalGuards).toHaveLength(1);
    expect(globalGuards[0]).toBeInstanceOf(UserAwareThrottlerGuard);
  });

  it("makes JwtService injectable (re-exported via AuthModule)", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), ThrottlingModule],
    }).compile();

    const jwtService = moduleRef.get(JwtService);

    expect(jwtService).toBeInstanceOf(JwtService);
  });
});
