import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

export interface HealthResponse {
  status: "ok";
  version: string;
}

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  // ADR-012 / spec "Health Check Exempt From Throttling": liveness/readiness
  // probes must never be rate limited, regardless of call volume. The app's
  // global throttler is named "global" (throttling.module.ts), so the skip
  // MUST target it by name — a bare @SkipThrottle() only skips a throttler
  // named "default" and would leave this route throttled.
  @SkipThrottle({ global: true })
  @ApiOperation({ summary: "Liveness check — no authentication required" })
  getHealth(): HealthResponse {
    return {
      status: "ok",
      version: process.env["npm_package_version"] ?? "0.1.0",
    };
  }
}
