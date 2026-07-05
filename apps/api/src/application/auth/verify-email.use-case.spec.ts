import { createHash } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { User, UserRole } from "../../domain/user.entity";
import type { UserRepositoryPort } from "../../ports/user-repository.port";
import { VerifyEmailUseCase } from "./verify-email.use-case";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildUserRepository(
  overrides: Partial<UserRepositoryPort> = {},
): UserRepositoryPort {
  return {
    findByEmail: vi.fn(),
    findByVerificationToken: vi.fn(),
    existsByEmail: vi.fn(),
    save: vi.fn(),
    markEmailVerified: vi.fn().mockResolvedValue(undefined),
    createOrgWithAdmin: vi.fn(),
    ...overrides,
  };
}

describe("VerifyEmailUseCase", () => {
  const rawToken = "raw-token";
  const tokenHash = sha256(rawToken);

  let userRepository: UserRepositoryPort;
  let useCase: VerifyEmailUseCase;

  beforeEach(() => {
    userRepository = buildUserRepository();
    useCase = new VerifyEmailUseCase(userRepository);
  });

  it("marks the user verified given a valid, unexpired token", async () => {
    const user = new User(
      "user-1",
      "user@example.com",
      "hashed-password",
      UserRole.ADMIN,
      false,
      "org-1",
      new Date(),
      tokenHash,
      new Date(Date.now() + 60_000),
    );
    userRepository.findByVerificationToken = vi.fn().mockResolvedValue(user);

    await useCase.execute(rawToken);

    expect(userRepository.findByVerificationToken).toHaveBeenCalledWith(tokenHash);
    expect(userRepository.markEmailVerified).toHaveBeenCalledWith("user-1");
  });

  it("rejects an expired token", async () => {
    const user = new User(
      "user-1",
      "user@example.com",
      "hashed-password",
      UserRole.ADMIN,
      false,
      "org-1",
      new Date(),
      tokenHash,
      new Date(Date.now() - 60_000),
    );
    userRepository.findByVerificationToken = vi.fn().mockResolvedValue(user);

    await expect(useCase.execute(rawToken)).rejects.toThrow(BadRequestException);
    expect(userRepository.markEmailVerified).not.toHaveBeenCalled();
  });

  it("rejects an unknown/invalid token", async () => {
    userRepository.findByVerificationToken = vi.fn().mockResolvedValue(null);

    await expect(useCase.execute("unknown-token")).rejects.toThrow(BadRequestException);
    expect(userRepository.markEmailVerified).not.toHaveBeenCalled();
  });
});
