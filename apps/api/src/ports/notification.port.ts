export const NOTIFICATION_PORT = Symbol("NotificationPort");

export interface NotificationPort {
  sendVerificationEmail(email: string, rawToken: string): Promise<void>;
  sendPasswordResetEmail(email: string, rawToken: string): Promise<void>;
  /**
   * Tells the owner of an already-registered email that someone tried to
   * register with it. Registration itself answers identically for new and
   * existing emails (no account enumeration), so this is the only signal.
   */
  sendAccountExistsNotice(email: string): Promise<void>;
}
