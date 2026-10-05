import { Inject, Injectable, Logger } from "@nestjs/common";
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

/**
 * Deliberately neutral: identical for a new and an already-registered email
 * so the endpoint cannot be used to enumerate accounts (same principle as
 * login and forgot-password). No ids are echoed back.
 */
export interface RegisterResult {
  ok: true;
}

const REGISTER_RESULT: RegisterResult = { ok: true };

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

  private readonly logger = new Logger(RegisterUseCase.name);

  async execute(email: string, password: string): Promise<RegisterResult> {
    const alreadyExists = await this.userRepository.existsByEmail(email);

    // Hash in BOTH branches so a duplicate email is not measurably faster
    // than a new one (timing-based enumeration).
    const passwordHash = await this.passwordHasher.hash(password);

    if (alreadyExists) {
      // Create nothing and reveal nothing: the caller gets the same 201 body;
      // only the real owner learns about the attempt, by email.
      // A failing notifier must not turn into a 500: that would reveal the
      // account exists. Log without the email and answer the same.
      try {
        await this.notificationPort.sendAccountExistsNotice(email);
      } catch {
        this.logger.warn("Account-exists notice could not be sent");
      }
      return { ...REGISTER_RESULT };
    }

    // Raw token is only ever handed to the (stub) notifier; the DB only ever
    // stores its SHA-256 hash (D9), same principle as password storage.
    const rawToken = uuidv4();
    const verificationTokenHash = createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const verificationExpiresAt = new Date(
      Date.now() + VERIFICATION_TOKEN_TTL_MS,
    );

    await this.userRepository.createOrgWithAdmin({
      orgName: this.deriveOrgName(email),
      email,
      passwordHash,
      verificationTokenHash,
      verificationExpiresAt,
    });

    await this.notificationPort.sendVerificationEmail(email, rawToken);

    return { ...REGISTER_RESULT };
  }

  // MVP has no dedicated "organization name" input field on registration
  // (single-user org, RF-004) — derive a placeholder name from the email so
  // the record is not blank; the admin can rename it later.
  private deriveOrgName(email: string): string {
    const [localPart] = email.split("@");
    return `${localPart}'s Organization`;
  }
}
