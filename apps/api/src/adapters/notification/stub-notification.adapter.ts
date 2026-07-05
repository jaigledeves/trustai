import { Injectable, Logger } from "@nestjs/common";
import type { NotificationPort } from "../../ports/notification.port";

/**
 * MVP stub: logs the verification token instead of sending a real email.
 * The raw token is logged intentionally so verification can be exercised
 * end-to-end without an email provider (D9). No other PII (e.g. password)
 * is ever logged here.
 */
@Injectable()
export class StubNotificationAdapter implements NotificationPort {
  private readonly logger = new Logger(StubNotificationAdapter.name);

  async sendVerificationEmail(email: string, rawToken: string): Promise<void> {
    this.logger.log(
      `[STUB NotificationPort] Verification email for ${email}: token=${rawToken}`,
    );
  }
}
