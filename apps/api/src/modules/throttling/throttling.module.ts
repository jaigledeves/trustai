import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "../auth/auth.module";
import { UserAwareThrottlerGuard } from "./user-aware-throttler.guard";

const DEFAULT_THROTTLE_TTL_SECONDS = 60;
export const DEFAULT_THROTTLE_LIMIT = 100;
const SECONDS_TO_MS = 1000;
export const GLOBAL_THROTTLER_NAME = "global";

/**
 * Registers the app-wide `APP_GUARD` (ADR-012, spec "Global Default
 * Throttle Coverage"). Named throttler `"global"` — deliberately NOT
 * `"default"`, so it can never collide with `public-verification`'s own
 * module-local `"default"` throttler (that module is exempted from this
 * guard entirely via `@SkipThrottle({ global: true })`).
 *
 * Imports `AuthModule` (not just `JwtModule` directly) per ADR-012's
 * decision — `AuthModule` re-exports `JwtModule`, making `JwtService`
 * injectable into `UserAwareThrottlerGuard` without duplicating the JWT
 * config here.
 */
@Module({
  imports: [
    ConfigModule,
    AuthModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: GLOBAL_THROTTLER_NAME,
            // ThrottlerOptions.ttl is in milliseconds (@nestjs/throttler v6);
            // THROTTLE_TTL_SECONDS is expressed in seconds for readability.
            ttl:
              Number(configService.get<string>("THROTTLE_TTL_SECONDS", String(DEFAULT_THROTTLE_TTL_SECONDS))) *
              SECONDS_TO_MS,
            limit: Number(
              configService.get<string>("THROTTLE_LIMIT", String(DEFAULT_THROTTLE_LIMIT)),
            ),
          },
        ],
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: UserAwareThrottlerGuard }],
})
export class ThrottlingModule {}
