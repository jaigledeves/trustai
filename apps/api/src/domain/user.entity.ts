export enum UserRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly role: UserRole,
    public readonly emailVerified: boolean,
    public readonly organizationId: string,
    public readonly createdAt: Date,
    public readonly emailVerificationToken: string | null = null,
    public readonly emailVerificationExpiresAt: Date | null = null,
    public readonly passwordResetToken: string | null = null,
    public readonly passwordResetExpiresAt: Date | null = null,
  ) {}

  isVerified(): boolean {
    return this.emailVerified;
  }

  hasValidVerificationToken(token: string): boolean {
    if (!this.emailVerificationToken || !this.emailVerificationExpiresAt) {
      return false;
    }
    return (
      this.emailVerificationToken === token &&
      this.emailVerificationExpiresAt > new Date()
    );
  }

  hasValidPasswordResetToken(tokenHash: string): boolean {
    if (!this.passwordResetToken || !this.passwordResetExpiresAt) {
      return false;
    }
    return (
      this.passwordResetToken === tokenHash &&
      this.passwordResetExpiresAt > new Date()
    );
  }
}
