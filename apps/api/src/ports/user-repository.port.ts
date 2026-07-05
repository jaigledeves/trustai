import type { Organization } from "../domain/organization.entity.js";
import type { User } from "../domain/user.entity.js";

export const USER_REPOSITORY_PORT = Symbol("UserRepositoryPort");

export interface UserRepositoryPort {
  findByEmail(email: string): Promise<User | null>;
  findByVerificationToken(tokenHash: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  save(user: Omit<User, "id" | "createdAt"> & { id?: string }): Promise<User>;
  markEmailVerified(userId: string): Promise<void>;
  createOrgWithAdmin(params: {
    orgName: string;
    email: string;
    passwordHash: string;
    verificationTokenHash: string;
    verificationExpiresAt: Date;
  }): Promise<{ org: Organization; user: User }>;
}
