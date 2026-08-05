import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { User, UserRole } from "../../domain/user.entity";
import type { PasswordHasherPort } from "../../ports/password-hasher.port";
import type { UserRepositoryPort } from "../../ports/user-repository.port";
import { LoginUseCase } from "./login.use-case";

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
    setPasswordResetToken: vi.fn(),
    resetPassword: vi.fn(),
    createOrgWithAdmin: vi.fn(),
    ...overrides,
  };
}

function buildPasswordHasher(
  overrides: Partial<PasswordHasherPort> = {},
): PasswordHasherPort {
  return {
    hash: vi.fn(),
    verify: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function buildJwtService(): JwtService {
  return {
    signAsync: vi.fn().mockResolvedValue("signed.jwt.token"),
  } as unknown as JwtService;
}

const verifiedUser = new User(
  "user-1",
  "user@example.com",
  "hashed-password",
  UserRole.ADMIN,
  true,
  "org-1",
  new Date(),
);

const unverifiedUser = new User(
  "user-2",
  "unverified@example.com",
  "hashed-password",
  UserRole.MEMBER,
  false,
  "org-1",
  new Date(),
);

describe("LoginUseCase", () => {
  let userRepository: UserRepositoryPort;
  let passwordHasher: PasswordHasherPort;
  let jwtService: JwtService;
  let useCase: LoginUseCase;

  beforeEach(() => {
    userRepository = buildUserRepository();
    passwordHasher = buildPasswordHasher();
    jwtService = buildJwtService();
    useCase = new LoginUseCase(userRepository, passwordHasher, jwtService);
  });

  it("returns an access token for correct credentials on a verified account", async () => {
    userRepository.findByEmail = vi.fn().mockResolvedValue(verifiedUser);
    passwordHasher.verify = vi.fn().mockResolvedValue(true);

    const result = await useCase.execute("user@example.com", "correct-password");

    expect(result).toEqual({ accessToken: "signed.jwt.token" });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: "user-1",
      organizationId: "org-1",
      role: UserRole.ADMIN,
      email: "user@example.com",
    });
  });

  it("throws UnauthorizedException for a wrong password", async () => {
    userRepository.findByEmail = vi.fn().mockResolvedValue(verifiedUser);
    passwordHasher.verify = vi.fn().mockResolvedValue(false);

    await expect(useCase.execute("user@example.com", "wrong-password")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("throws ForbiddenException for an unverified account with correct credentials", async () => {
    userRepository.findByEmail = vi.fn().mockResolvedValue(unverifiedUser);
    passwordHasher.verify = vi.fn().mockResolvedValue(true);

    await expect(
      useCase.execute("unverified@example.com", "correct-password"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("throws UnauthorizedException for a non-existent user and still calls verify() against the dummy hash (D8)", async () => {
    userRepository.findByEmail = vi.fn().mockResolvedValue(null);
    passwordHasher.verify = vi.fn().mockResolvedValue(false);

    await expect(
      useCase.execute("nobody@example.com", "whatever-password"),
    ).rejects.toThrow(UnauthorizedException);

    expect(passwordHasher.verify).toHaveBeenCalledTimes(1);
    const [hashArg, passwordArg] = (passwordHasher.verify as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, string];
    expect(hashArg).toMatch(/^\$argon2id\$/);
    expect(hashArg).not.toBe("hashed-password");
    expect(passwordArg).toBe("whatever-password");
  });
});
