import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from "../../ports/password-hasher.port";
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from "../../ports/user-repository.port";

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await this.userRepository.findByPasswordResetToken(tokenHash);

    if (!user || !user.hasValidPasswordResetToken(tokenHash)) {
      throw new BadRequestException("Invalid or expired password reset token");
    }

    const newPasswordHash = await this.passwordHasher.hash(newPassword);

    // Clears both reset columns (single-use) and sets emailVerified = true
    // — possessing a working reset link proves email ownership (design.md
    // "isVerified on reset" decision).
    await this.userRepository.resetPassword(user.id, newPasswordHash);
  }
}
