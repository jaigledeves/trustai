import { createHash } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { User, UserRole } from "../../domain/user.entity";
import type { PasswordHasherPort } from "../../ports/password-hasher.port";
import type { UserRepositoryPort } from "../../ports/user-repository.port";
import { ResetPasswordUseCase } from "./reset-password.use-case";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildUserRepository(
  overrides: Partial<UserRepositoryPort> = {},
): UserRepositoryPort {
  return {
    findByEmail: vi.fn(),
    findByVerificationToken: vi.fn(),
    findByPasswordResetToken: vi.fn(),
    existsByEmail: vi.fn(),
    save: vi.fn(),
    markEmailVerified: vi.fn(),
    setPasswordResetToken: vi.fn(),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    createOrgWithAdmin: vi.fn(),
    ...overrides,
  };
}

function buildPasswordHasher(
  overrides: Partial<PasswordHasherPort> = {},
): PasswordHasherPort {
  return {
    hash: vi.fn().mockResolvedValue("new-hashed-password"),
    verify: vi.fn(),
    ...overrides,
  };
}

describe("ResetPasswordUseCase", () => {
  const rawToken = "raw-reset-token";
  const tokenHash = sha256(rawToken);

  let userRepository: UserRepositoryPort;
  let passwordHasher: PasswordHasherPort;
  let useCase: ResetPasswordUseCase;

  beforeEach(() => {
    userRepository = buildUserRepository();
    passwordHasher = buildPasswordHasher();
    useCase = new ResetPasswordUseCase(userRepository, passwordHasher);
  });

  it("resets the password given a valid, unexpired token", async () => {
    const user = new User(
      "user-1",
      "user@example.com",
      "old-hashed-password",
      UserRole.ADMIN,
      false,
      "org-1",
      new Date(),
      null,
      null,
      tokenHash,
      new Date(Date.now() + 60_000),
    );
    userRepository = buildUserRepository({
      findByPasswordResetToken: vi.fn().mockResolvedValue(user),
    });
    useCase = new ResetPasswordUseCase(userRepository, passwordHasher);

    await useCase.execute(rawToken, "newPassword123");

    expect(userRepository.findByPasswordResetToken).toHaveBeenCalledWith(tokenHash);
    expect(passwordHasher.hash).toHaveBeenCalledWith("newPassword123");
    expect(userRepository.resetPassword).toHaveBeenCalledWith(
      "user-1",
      "new-hashed-password",
    );
  });

  it("throws BadRequestException for an expired token and does not reset", async () => {
    const user = new User(
      "user-1",
      "user@example.com",
      "old-hashed-password",
      UserRole.ADMIN,
      false,
      "org-1",
      new Date(),
      null,
      null,
      tokenHash,
      new Date(Date.now() - 60_000),
    );
    userRepository = buildUserRepository({
      findByPasswordResetToken: vi.fn().mockResolvedValue(user),
    });
    useCase = new ResetPasswordUseCase(userRepository, passwordHasher);

    await expect(useCase.execute(rawToken, "newPassword123")).rejects.toThrow(
      BadRequestException,
    );
    expect(userRepository.resetPassword).not.toHaveBeenCalled();
  });

  it("throws BadRequestException for an unknown token and does not reset", async () => {
    userRepository = buildUserRepository({
      findByPasswordResetToken: vi.fn().mockResolvedValue(null),
    });
    useCase = new ResetPasswordUseCase(userRepository, passwordHasher);

    await expect(useCase.execute("unknown-token", "newPassword123")).rejects.toThrow(
      BadRequestException,
    );
    expect(userRepository.resetPassword).not.toHaveBeenCalled();
  });

  it("hashes the new password with the same hasher port register uses", async () => {
    const user = new User(
      "user-1",
      "user@example.com",
      "old-hashed-password",
      UserRole.ADMIN,
      false,
      "org-1",
      new Date(),
      null,
      null,
      tokenHash,
      new Date(Date.now() + 60_000),
    );
    userRepository = buildUserRepository({
      findByPasswordResetToken: vi.fn().mockResolvedValue(user),
    });
    useCase = new ResetPasswordUseCase(userRepository, passwordHasher);

    await useCase.execute(rawToken, "newPassword123");

    const persistedHash = (userRepository.resetPassword as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1];
    expect(persistedHash).toBe("new-hashed-password");
    expect(persistedHash).not.toBe("newPassword123");
  });
});
