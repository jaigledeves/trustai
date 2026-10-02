import type { ExecutionContext } from "@nestjs/common";
import type { ApplicationConfig } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { getOptionsToken, type ThrottlerModuleOptions, type ThrottlerOptions } from "@nestjs/throttler";
import { describe, expect, it } from "vitest";
import {
  AUTH_THROTTLE_TTL_MS,
  AccountThrottle,
  accountTracker,
  resolveAuthThrottleLimit,
} from "../auth/auth-throttle";
import { ACCOUNT_THROTTLER_NAME, GLOBAL_THROTTLER_NAME, ThrottlingModule } from "./throttling.module";
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

  it("registers the global per-IP throttler and the opt-in account throttler", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), ThrottlingModule],
    }).compile();

    const options = moduleRef.get<ThrottlerModuleOptions>(getOptionsToken(), { strict: false });
    const throttlers = (Array.isArray(options) ? options : options.throttlers) as ThrottlerOptions[];
    const names = throttlers.map((throttler) => throttler.name);
    expect(names).toEqual(expect.arrayContaining([GLOBAL_THROTTLER_NAME, ACCOUNT_THROTTLER_NAME]));

    const global = throttlers.find((throttler) => throttler.name === GLOBAL_THROTTLER_NAME);
    expect(global?.getTracker).toBeUndefined();
    expect(global?.skipIf).toBeUndefined();

    const account = throttlers.find((throttler) => throttler.name === ACCOUNT_THROTTLER_NAME);
    expect(account?.ttl).toBe(AUTH_THROTTLE_TTL_MS);
    expect(account?.limit).toBe(resolveAuthThrottleLimit);
    expect(account?.getTracker).toBe(accountTracker);

    class Probe {
      unmarked(): void {}
      @AccountThrottle()
      marked(): void {}
    }
    const contextFor = (handler: () => void) =>
      ({ getHandler: () => handler }) as unknown as ExecutionContext;
    expect(account?.skipIf?.(contextFor(Probe.prototype.unmarked))).toBe(true);
    expect(account?.skipIf?.(contextFor(Probe.prototype.marked))).toBe(false);
  });
});
