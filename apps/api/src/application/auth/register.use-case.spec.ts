import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Organization } from "../../domain/organization.entity";
import { User, UserRole } from "../../domain/user.entity";
import type { NotificationPort } from "../../ports/notification.port";
import type { PasswordHasherPort } from "../../ports/password-hasher.port";
import type { UserRepositoryPort } from "../../ports/user-repository.port";
import { RegisterUseCase } from "./register.use-case";

function buildUserRepository(
  overrides: Partial<UserRepositoryPort> = {},
): UserRepositoryPort {
  return {
    findByEmail: vi.fn(),
    findByVerificationToken: vi.fn(),
    findByPasswordResetToken: vi.fn(),
    existsByEmail: vi.fn().mockResolvedValue(false),
    save: vi.fn(),
    markEmailVerified: vi.fn(),
    setPasswordResetToken: vi.fn(),
    resetPassword: vi.fn(),
    createOrgWithAdmin: vi.fn().mockResolvedValue({
      org: new Organization("org-1", "user's Organization", "starter", new Date()),
      user: new User(
        "user-1",
        "user@example.com",
        "hashed-password",
        UserRole.ADMIN,
        false,
        "org-1",
        new Date(),
        "token-hash",
        new Date(Date.now() + 60_000),
      ),
    }),
    ...overrides,
  };
}

function buildPasswordHasher(
  overrides: Partial<PasswordHasherPort> = {},
): PasswordHasherPort {
  return {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    verify: vi.fn(),
    ...overrides,
  };
}

function buildNotificationPort(
  overrides: Partial<NotificationPort> = {},
): NotificationPort {
  return {
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("RegisterUseCase", () => {
  let userRepository: UserRepositoryPort;
  let passwordHasher: PasswordHasherPort;
  let notificationPort: NotificationPort;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    userRepository = buildUserRepository();
    passwordHasher = buildPasswordHasher();
    notificationPort = buildNotificationPort();
    useCase = new RegisterUseCase(userRepository, passwordHasher, notificationPort);
  });

  it("registers a new organization admin and dispatches a verification email", async () => {
    const result = await useCase.execute("user@example.com", "password123");

    expect(result).toEqual({ userId: "user-1", organizationId: "org-1" });
    expect(userRepository.createOrgWithAdmin).toHaveBeenCalledTimes(1);
    expect(notificationPort.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(notificationPort.sendVerificationEmail).toHaveBeenCalledWith(
      "user@example.com",
      expect.any(String),
    );
  });

  it("hashes the password before persisting", async () => {
    await useCase.execute("user@example.com", "password123");

    expect(passwordHasher.hash).toHaveBeenCalledWith("password123");
    const createArgs = (userRepository.createOrgWithAdmin as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(createArgs.passwordHash).toBe("hashed-password");
    expect(createArgs.passwordHash).not.toBe("password123");
  });

  it("stores a SHA-256 hash of the verification token, not the raw token", async () => {
    await useCase.execute("user@example.com", "password123");

    const createArgs = (userRepository.createOrgWithAdmin as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    const [, rawToken] = (notificationPort.sendVerificationEmail as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, string];

    expect(createArgs.verificationTokenHash).not.toBe(rawToken);
    expect(createArgs.verificationTokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("throws ConflictException for a duplicate email and does not create anything", async () => {
    userRepository = buildUserRepository({
      existsByEmail: vi.fn().mockResolvedValue(true),
    });
    useCase = new RegisterUseCase(userRepository, passwordHasher, notificationPort);

    await expect(useCase.execute("user@example.com", "password123")).rejects.toThrow(
      ConflictException,
    );
    expect(userRepository.createOrgWithAdmin).not.toHaveBeenCalled();
    expect(notificationPort.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
