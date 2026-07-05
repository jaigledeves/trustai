import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import {
  NOTIFICATION_PORT,
  type NotificationPort,
} from "../../ports/notification.port";
import {
  PASSWORD_HASHER_PORT,
  type PasswordHasherPort,
} from "../../ports/password-hasher.port";
import {
  USER_REPOSITORY_PORT,
  type UserRepositoryPort,
} from "../../ports/user-repository.port";

// Email verification tokens are valid for 24h before requiring a new
// registration/resend flow.
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export interface RegisterResult {
  userId: string;
  organizationId: string;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(NOTIFICATION_PORT)
    private readonly notificationPort: NotificationPort,
  ) {}

  async execute(email: string, password: string): Promise<RegisterResult> {
    const alreadyExists = await this.userRepository.existsByEmail(email);
    if (alreadyExists) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await this.passwordHasher.hash(password);

    // Raw token is only ever handed to the (stub) notifier; the DB only ever
    // stores its SHA-256 hash (D9), same principle as password storage.
    const rawToken = uuidv4();
    const verificationTokenHash = createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const verificationExpiresAt = new Date(
      Date.now() + VERIFICATION_TOKEN_TTL_MS,
    );

    const { org, user } = await this.userRepository.createOrgWithAdmin({
      orgName: this.deriveOrgName(email),
      email,
      passwordHash,
      verificationTokenHash,
      verificationExpiresAt,
    });

    await this.notificationPort.sendVerificationEmail(email, rawToken);

    return { userId: user.id, organizationId: org.id };
  }

  // MVP has no dedicated "organization name" input field on registration
  // (single-user org, RF-004) — derive a placeholder name from the email so
  // the record is not blank; the admin can rename it later.
  private deriveOrgName(email: string): string {
    const [localPart] = email.split("@");
    return `${localPart}'s Organization`;
  }
}
