import type { Reflector } from "@nestjs/core";
import type { JwtService } from "@nestjs/jwt";
import type { ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";
import { describe, expect, it, vi } from "vitest";
import type { JwtPayload } from "../../application/auth/login.use-case";
import { UserRole } from "../../domain/user.entity";
import { UserAwareThrottlerGuard } from "./user-aware-throttler.guard";

/** Bare-minimum options/storage/reflector — UserAwareThrottlerGuard's constructor only forwards them to `super()`. */
function buildGuard(jwtService: Pick<JwtService, "verifyAsync">): UserAwareThrottlerGuard {
  const options = { throttlers: [{ ttl: 60_000, limit: 100 }] } as ThrottlerModuleOptions;
  const storage = {} as ThrottlerStorage;
  const reflector = {} as Reflector;
  return new UserAwareThrottlerGuard(options, storage, reflector, jwtService as JwtService);
}

function buildPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: "user-1",
    organizationId: "org-1",
    role: UserRole.MEMBER,
    email: "user1@example.com",
    ...overrides,
  };
}

/** Calls the guard's protected `getTracker` — protected is a compile-time-only restriction in TS. */
async function callGetTracker(
  guard: UserAwareThrottlerGuard,
  req: Record<string, unknown>,
): Promise<string> {
  return (guard as unknown as { getTracker(req: Record<string, unknown>): Promise<string> }).getTracker(
    req,
  );
}

function buildRequest(overrides: {
  authorization?: string;
  ip?: string;
} = {}): Record<string, unknown> {
  return {
    headers: overrides.authorization !== undefined ? { authorization: overrides.authorization } : {},
    ip: overrides.ip ?? "203.0.113.5",
  };
}

describe("UserAwareThrottlerGuard", () => {
  describe("getTracker", () => {
    it("returns `user:<sub>` for a request with a valid Bearer token", async () => {
      const verifyAsync = vi.fn().mockResolvedValue(buildPayload({ sub: "user-42" }));
      const guard = buildGuard({ verifyAsync });
      const req = buildRequest({ authorization: "Bearer valid-token" });

      const tracker = await callGetTracker(guard, req);

      expect(tracker).toBe("user:user-42");
      expect(verifyAsync).toHaveBeenCalledWith("valid-token");
    });

    it("falls back to `ip:<ip>` when no Authorization header is present", async () => {
      const verifyAsync = vi.fn();
      const guard = buildGuard({ verifyAsync });
      const req = buildRequest({ ip: "198.51.100.9" });

      const tracker = await callGetTracker(guard, req);

      expect(tracker).toBe("ip:198.51.100.9");
      expect(verifyAsync).not.toHaveBeenCalled();
    });

    it("falls back to `ip:<ip>` when the token is invalid/expired, without throwing", async () => {
      const verifyAsync = vi.fn().mockRejectedValue(new Error("jwt expired"));
      const guard = buildGuard({ verifyAsync });
      const req = buildRequest({ authorization: "Bearer garbage-or-expired", ip: "198.51.100.9" });

      const tracker = await callGetTracker(guard, req);

      expect(tracker).toBe("ip:198.51.100.9");
    });

    it("falls back to `ip:<ip>` when the Authorization header isn't a Bearer scheme", async () => {
      const verifyAsync = vi.fn();
      const guard = buildGuard({ verifyAsync });
      const req = buildRequest({ authorization: "Basic dXNlcjpwYXNz", ip: "198.51.100.9" });

      const tracker = await callGetTracker(guard, req);

      expect(tracker).toBe("ip:198.51.100.9");
      expect(verifyAsync).not.toHaveBeenCalled();
    });

    it("gives two different authenticated users on the same IP distinct tracker keys (spec: Auth-Aware Request Tracking)", async () => {
      const verifyAsync = vi
        .fn()
        .mockResolvedValueOnce(buildPayload({ sub: "user-a" }))
        .mockResolvedValueOnce(buildPayload({ sub: "user-b" }));
      const guard = buildGuard({ verifyAsync });
      const sameIp = "192.0.2.1";

      const trackerA = await callGetTracker(
        guard,
        buildRequest({ authorization: "Bearer token-a", ip: sameIp }),
      );
      const trackerB = await callGetTracker(
        guard,
        buildRequest({ authorization: "Bearer token-b", ip: sameIp }),
      );

      expect(trackerA).toBe("user:user-a");
      expect(trackerB).toBe("user:user-b");
      expect(trackerA).not.toBe(trackerB);
    });

    it("shares one IP-keyed bucket for two anonymous requests from the same IP (spec: Anonymous requests share a bucket)", async () => {
      const verifyAsync = vi.fn();
      const guard = buildGuard({ verifyAsync });
      const sameIp = "192.0.2.9";

      const trackerA = await callGetTracker(guard, buildRequest({ ip: sameIp }));
      const trackerB = await callGetTracker(guard, buildRequest({ ip: sameIp }));

      expect(trackerA).toBe(trackerB);
      expect(trackerA).toBe("ip:192.0.2.9");
    });
  });
});
