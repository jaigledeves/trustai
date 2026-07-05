export const NOTIFICATION_PORT = Symbol("NotificationPort");

export interface NotificationPort {
  sendVerificationEmail(email: string, rawToken: string): Promise<void>;
}
