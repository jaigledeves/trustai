import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from "@nestjs/throttler";
import type { JwtPayload } from "../../application/auth/login.use-case";

const BEARER_PREFIX = "Bearer ";

/**
 * Global (`APP_GUARD`) throttler guard, keyed by authenticated user identity
 * instead of client IP alone (ADR-012, spec "Auth-Aware Request Tracking").
 *
 * `getTracker` self-verifies the Bearer JWT via the injected `JwtService`
 * instead of reading `req.user`: global guards run BEFORE controller-level
 * guards in Nest's request lifecycle, so `JwtAuthGuard`/`JwtStrategy`
 * haven't populated `req.user` yet when this runs. Verifying here is
 * read-only and side-effect-free — an invalid/expired/missing token simply
 * falls back to `ip:<ip>`; it never throws or blocks the request. Whether
 * the token is otherwise valid for authentication is decided later, as
 * always, by the route's own `JwtAuthGuard`.
 */
@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super(options, storage, reflector);
  }

  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = req["headers"] as Record<string, string> | undefined;
    const authorization = headers?.["authorization"];
    const token = authorization?.startsWith(BEARER_PREFIX)
      ? authorization.slice(BEARER_PREFIX.length)
      : undefined;

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
        return `user:${payload.sub}`;
      } catch {
        // Invalid/expired token — fall through to the IP tracker below.
        // JwtAuthGuard (per-route) is the one that 401s it, not this guard.
      }
    }

    return `ip:${req["ip"] as string}`;
  }
}
