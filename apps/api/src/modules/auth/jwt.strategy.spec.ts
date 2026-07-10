import { describe, expect, it, vi } from "vitest";
import type { JwtPayload } from "../../application/auth/login.use-case";
import { UserRole } from "../../domain/user.entity";
import { JwtStrategy } from "./jwt.strategy";

function buildConfigService(jwtSecret = "test-secret") {
  return { get: vi.fn().mockReturnValue(jwtSecret) } as never;
}

describe("JwtStrategy", () => {
  describe("validate", () => {
    it("returns the full JWT payload as request.user", () => {
      const strategy = new JwtStrategy(buildConfigService());
      const payload: JwtPayload = {
        sub: "user-123",
        email: "alice@example.com",
        organizationId: "org-456",
        role: UserRole.ADMIN,
      };

      const result = strategy.validate(payload);

      expect(result).toStrictEqual(payload);
    });

    it("propagates all payload fields without mutation", () => {
      const strategy = new JwtStrategy(buildConfigService());
      const payload: JwtPayload = {
        sub: "user-789",
        email: "bob@example.com",
        organizationId: "org-000",
        role: UserRole.MEMBER,
      };

      const result = strategy.validate(payload);

      // Must be the same reference ÔÇö no cloning, no mutation.
      expect(result).toBe(payload);
    });
  });
});
