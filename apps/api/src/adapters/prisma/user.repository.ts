import { Injectable } from "@nestjs/common";
import type { User as PrismaUser } from "@prisma/client";
import { Organization } from "../../domain/organization.entity.js";
import { User, UserRole } from "../../domain/user.entity.js";
import type { UserRepositoryPort } from "../../ports/user-repository.port.js";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    // Email is globally unique (schema-level constraint) and is the pre-auth
    // identity lookup used by login/registration before an organizationId is
    // known. It intentionally has no organizationId scope — see RNF-004 note
    // on `save`/`markEmailVerified` below for the org-scoped counterpart.
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? this.toDomain(record) : null;
  }

  async findByVerificationToken(tokenHash: string): Promise<User | null> {
    const record = await this.prisma.user.findFirst({
      where: { emailVerificationToken: tokenHash },
    });
    return record ? this.toDomain(record) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email } });
    return count > 0;
  }

  async save(
    user: Omit<User, "id" | "createdAt"> & { id?: string },
  ): Promise<User> {
    const data = {
      email: user.email,
      passwordHash: user.passwordHash,
      role: this.toPrismaRole(user.role),
      emailVerified: user.emailVerified,
      emailVerificationToken: user.emailVerificationToken,
      emailVerificationExpiresAt: user.emailVerificationExpiresAt,
      organizationId: user.organizationId,
    };

    const record = user.id
      ? await this.prisma.user.update({
          // RNF-004 defense in depth: scope the update by organizationId in
          // addition to id, so an update can never cross a tenant boundary
          // even if a caller mistakenly supplies an id from another org.
          where: { id: user.id, organizationId: user.organizationId },
          data,
        })
      : await this.prisma.user.create({ data });

    return this.toDomain(record);
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });
  }

  async createOrgWithAdmin(params: {
    orgName: string;
    email: string;
    passwordHash: string;
    verificationTokenHash: string;
    verificationExpiresAt: Date;
  }): Promise<{ org: Organization; user: User }> {
    const [orgRecord, userRecord] = await this.prisma.$transaction(
      async (tx) => {
        const org = await tx.organization.create({
          data: { name: params.orgName, plan: "starter" },
        });
        const user = await tx.user.create({
          data: {
            email: params.email,
            passwordHash: params.passwordHash,
            role: "ADMIN",
            emailVerified: false,
            emailVerificationToken: params.verificationTokenHash,
            emailVerificationExpiresAt: params.verificationExpiresAt,
            organizationId: org.id,
          },
        });
        return [org, user] as const;
      },
    );

    return {
      org: this.toDomainOrganization(orgRecord),
      user: this.toDomain(userRecord),
    };
  }

  private toDomain(record: PrismaUser): User {
    return new User(
      record.id,
      record.email,
      record.passwordHash,
      this.toDomainRole(record.role),
      record.emailVerified,
      record.organizationId,
      record.createdAt,
      record.emailVerificationToken,
      record.emailVerificationExpiresAt,
    );
  }

  private toDomainOrganization(record: {
    id: string;
    name: string;
    plan: string;
    createdAt: Date;
  }): Organization {
    return new Organization(
      record.id,
      record.name,
      record.plan,
      record.createdAt,
    );
  }

  private toDomainRole(role: PrismaUser["role"]): UserRole {
    return role === "ADMIN" ? UserRole.ADMIN : UserRole.MEMBER;
  }

  private toPrismaRole(role: UserRole): PrismaUser["role"] {
    return role === UserRole.ADMIN ? "ADMIN" : "MEMBER";
  }
}
