import type { Organization } from "../domain/organization.entity";
import type { User } from "../domain/user.entity";

export const USER_REPOSITORY_PORT = Symbol("UserRepositoryPort");

export interface UserRepositoryPort {
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(tokenHash: string): Promise<User | null>;
  findByPasswordResetToken(tokenHash: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  save(user: Omit<User, "id" | "createdAt"> & { id?: string }): Promise<User>;
  markEmailVerified(userId: string): Promise<void>;
  setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  /**
   * Sets a new password hash, clears both reset token columns (single-use),
   * and marks the account email-verified — possessing a working reset link
   * is proof of email ownership (design.md "isVerified on reset" decision).
   */
  resetPassword(userId: string, newPasswordHash: string): Promise<void>;
  createOrgWithAdmin(params: {
    orgName: string;
    email: string;
    passwordHash: string;
    verificationTokenHash: string;
    verificationExpiresAt: Date;
  }): Promise<{ org: Organization; user: User }>;
}
