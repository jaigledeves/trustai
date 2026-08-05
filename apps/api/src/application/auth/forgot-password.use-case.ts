import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import {
  NOTIFICATION_PORT,
  type NotificationPort,
} from "../../ports/notification.port";
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from "../../ports/user-repository.port";

// Same TTL as email verification tokens (RegisterUseCase).
const PASSWORD_RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(NOTIFICATION_PORT)
    private readonly notificationPort: NotificationPort,
  ) {}

  /**
   * Enumeration defense: this method ALWAYS resolves without throwing,
   * regardless of whether the email is registered. The conditional work
   * (token generation, persistence, notification) happens only inside this
   * method when a matching user exists — the caller (AuthController) must
   * respond identically either way.
   */
  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return;
    }

    // Raw token is only ever handed to the (stub) notifier; the DB only
    // ever stores its SHA-256 hash — same pattern as RegisterUseCase's
    // verification token.
    const rawToken = uuidv4();
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    await this.userRepository.setPasswordResetToken(user.id, tokenHash, expiresAt);
    await this.notificationPort.sendPasswordResetEmail(email, rawToken);
  }
}
