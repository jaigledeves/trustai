import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from "../../ports/user-repository.port";

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(token: string): Promise<void> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await this.userRepository.findByVerificationToken(tokenHash);

    if (!user || !user.hasValidVerificationToken(tokenHash)) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    await this.userRepository.markEmailVerified(user.id);
  }
}
