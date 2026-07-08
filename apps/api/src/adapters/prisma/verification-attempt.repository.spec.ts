import { describe, expect, it, vi } from "vitest";
import type { RecordAttemptFields } from "../../ports/verification-attempt-repository.port";
import { PrismaVerificationAttemptRepository } from "./verification-attempt.repository";
import type { PrismaService } from "./prisma.service";

function buildFakePrisma(overrides: { create?: ReturnType<typeof vi.fn> } = {}): PrismaService {
  return {
    verificationAttempt: {
      create: overrides.create ?? vi.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;
}

describe("PrismaVerificationAttemptRepository (VerificationAttemptRepositoryPort)", () => {
  it("inserts a row with the given trustRecordId, type, verdict, and channel", async () => {
    const create = vi.fn().mockResolvedValue({});
    const prisma = buildFakePrisma({ create });
    const repository = new PrismaVerificationAttemptRepository(prisma);

    const fields: RecordAttemptFields = {
      trustRecordId: "trust-record-1",
      type: "FULL",
      verdict: "VALID",
      channel: "QR",
    };

    await repository.record(fields);

    expect(create).toHaveBeenCalledWith({
      data: {
        trustRecordId: "trust-record-1",
        type: "FULL",
        verdict: "VALID",
        channel: "QR",
      },
    });
  });

  it("resolves to void — never leaks the created row to the caller", async () => {
    const prisma = buildFakePrisma();
    const repository = new PrismaVerificationAttemptRepository(prisma);

    await expect(
      repository.record({
        trustRecordId: "trust-record-2",
        type: "HASH_ONLY",
        verdict: "INVALID_RECORD",
        channel: "URL",
      }),
    ).resolves.toBeUndefined();
  });
});
