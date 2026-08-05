import { describe, expect, it, vi } from "vitest";
import { PrismaUserRepository } from "./user.repository";
import type { PrismaService } from "./prisma.service";

function buildFakePrismaUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "user@example.com",
    passwordHash: "hashed-password",
    role: "MEMBER",
    emailVerified: false,
    emailVerificationToken: null,
    emailVerificationExpiresAt: null,
    passwordResetToken: null,
    passwordResetExpiresAt: null,
    organizationId: "org-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function buildFakePrisma(overrides: {
  findFirst?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
} = {}): PrismaService {
  return {
    user: {
      findFirst: overrides.findFirst ?? vi.fn().mockResolvedValue(null),
      update: overrides.update ?? vi.fn().mockResolvedValue(buildFakePrismaUserRow()),
    },
  } as unknown as PrismaService;
}

describe("PrismaUserRepository — password reset", () => {
  describe("findByPasswordResetToken", () => {
    it("looks up a user by the passwordResetToken hash (unscoped findFirst)", async () => {
      const findFirst = vi
        .fn()
        .mockResolvedValue(buildFakePrismaUserRow({ passwordResetToken: "hash-1" }));
      const prisma = buildFakePrisma({ findFirst });
      const repository = new PrismaUserRepository(prisma);

      const user = await repository.findByPasswordResetToken("hash-1");

      expect(findFirst).toHaveBeenCalledWith({
        where: { passwordResetToken: "hash-1" },
      });
      expect(user?.id).toBe("user-1");
    });

    it("returns null when no user matches the hash", async () => {
      const prisma = buildFakePrisma({ findFirst: vi.fn().mockResolvedValue(null) });
      const repository = new PrismaUserRepository(prisma);

      const user = await repository.findByPasswordResetToken("unknown-hash");

      expect(user).toBeNull();
    });
  });

  describe("setPasswordResetToken", () => {
    it("persists the hash and expiry on the given user", async () => {
      const update = vi.fn().mockResolvedValue(buildFakePrismaUserRow());
      const prisma = buildFakePrisma({ update });
      const repository = new PrismaUserRepository(prisma);
      const expiresAt = new Date(Date.now() + 60_000);

      await repository.setPasswordResetToken("user-1", "hash-1", expiresAt);

      expect(update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordResetToken: "hash-1", passwordResetExpiresAt: expiresAt },
      });
    });
  });

  describe("resetPassword", () => {
    it("sets the new password hash, clears both reset columns, and verifies the email", async () => {
      const update = vi.fn().mockResolvedValue(buildFakePrismaUserRow());
      const prisma = buildFakePrisma({ update });
      const repository = new PrismaUserRepository(prisma);

      await repository.resetPassword("user-1", "new-hashed-password");

      expect(update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          passwordHash: "new-hashed-password",
          passwordResetToken: null,
          passwordResetExpiresAt: null,
          emailVerified: true,
        },
      });
    });
  });
});
