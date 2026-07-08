export const VERIFICATION_ATTEMPT_REPOSITORY_PORT = Symbol("VerificationAttemptRepositoryPort");

/**
 * Mirrors the Prisma `VerificationType`/`VerificationVerdict`/
 * `VerificationChannel` enums (schema.prisma) as string literal unions —
 * ports stay framework-free, no `@prisma/client` import here.
 */
export type VerificationAttemptType = "FULL" | "HASH_ONLY";
export type VerificationAttemptVerdict =
  | "VALID"
  | "ASSET_MISMATCH"
  | "INVALID_RECORD"
  | "PENDING_ANCHOR";
export type VerificationAttemptChannel = "QR" | "URL" | "HASH";

export interface RecordAttemptFields {
  trustRecordId: string;
  type: VerificationAttemptType;
  verdict: VerificationAttemptVerdict;
  channel: VerificationAttemptChannel;
}

/**
 * public-verification spec "Every Attempt Persisted" (RF-046): every
 * resolved GET/POST call to the public verification endpoints logs one
 * row here. design.md "Attempt logging for unknown ids": callers skip
 * calling `record()` entirely when `trustRecordId` can't be resolved
 * (required FK, no migration to make it nullable) — this port has no
 * "unknown id" case to represent.
 */
export interface VerificationAttemptRepositoryPort {
  record(fields: RecordAttemptFields): Promise<void>;
}
