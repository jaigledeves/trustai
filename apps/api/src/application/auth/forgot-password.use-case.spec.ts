import { beforeEach, describe, expect, it, vi } from "vitest";
import { User, UserRole } from "../../domain/user.entity";
import type { NotificationPort } from "../../ports/notification.port";
import type { UserRepositoryPort } from "../../ports/user-repository.port";
import { ForgotPasswordUseCase } from "./forgot-password.use-case";

function buildUserRepository(
  overrides: Partial<UserRepositoryPort> = {},
): UserRepositoryPort {
  return {
    findByEmail: vi.fn().mockResolvedValue(null),
    findByVerificationToken: vi.fn(),
    findByPasswordResetToken: vi.fn(),
    existsByEmail: vi.fn(),
    save: vi.fn(),
    markEmailVerified: vi.fn(),
    setPasswordResetToken: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn(),
    createOrgWithAdmin: vi.fn(),
    ...overrides,
  };
}

function buildNotificationPort(
  overrides: Partial<NotificationPort> = {},
): NotificationPort {
  return {
    sendVerificationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const existingUser = new User(
  "user-1",
  "user@example.com",
  "hashed-password",
  UserRole.ADMIN,
  true,
  "org-1",
  new Date(),
);

describe("ForgotPasswordUseCase", () => {
  let userRepository: UserRepositoryPort;
  let notificationPort: NotificationPort;
  let useCase: ForgotPasswordUseCase;

  beforeEach(() => {
    userRepository = buildUserRepository();
    notificationPort = buildNotificationPort();
    useCase = new ForgotPasswordUseCase(userRepository, notificationPort);
  });

  it("generates and stores a hashed token, then notifies, for a registered email", async () => {
    userRepository = buildUserRepository({
      findByEmail: vi.fn().mockResolvedValue(existingUser),
    });
    useCase = new ForgotPasswordUseCase(userRepository, notificationPort);

    await expect(useCase.execute("user@example.com")).resolves.toBeUndefined();

    expect(userRepository.setPasswordResetToken).toHaveBeenCalledTimes(1);
    const [userId, tokenHash, expiresAt] = (
      userRepository.setPasswordResetToken as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [string, string, Date];
    expect(userId).toBe("user-1");
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(notificationPort.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [notifiedEmail, rawToken] = (
      notificationPort.sendPasswordResetEmail as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [string, string];
    expect(notifiedEmail).toBe("user@example.com");
    expect(rawToken).not.toBe(tokenHash);
  });

  it("is a silent no-op for an unknown email but still resolves", async () => {
    userRepository = buildUserRepository({
      findByEmail: vi.fn().mockResolvedValue(null),
    });
    useCase = new ForgotPasswordUseCase(userRepository, notificationPort);

    await expect(useCase.execute("unknown@example.com")).resolves.toBeUndefined();

    expect(userRepository.setPasswordResetToken).not.toHaveBeenCalled();
    expect(notificationPort.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
