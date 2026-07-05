/**
 * Trust Record schema, version dtr-1.
 *
 * SCHEMA DISCIPLINE (ADR-001, INV-24): schemas are append-only across the
 * product's life. A new field or semantic change means a NEW schema
 * version constant and a new zod schema — existing versions are frozen
 * forever so historical DTRs keep verifying.
 */

import { z } from "zod";

export const DTR_SCHEMA_VERSION = "dtr-1" as const;

/** Document taxonomy v1 — beachhead segment (despachos/consultoras). */
export const DOCUMENT_TAXONOMY_V1 = [
  "contrato",
  "factura",
  "informe",
  "acta",
  "poder",
  "escritura",
  "escrito_procesal",
  "comunicacion",
  "certificado",
  "otro",
] as const;

export type DocumentClass = (typeof DOCUMENT_TAXONOMY_V1)[number];

const sha256HexSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "must be a lowercase 64-char hex SHA-256 digest");

/** ISO 8601 UTC instant, e.g. 2026-07-05T18:30:00Z */
const isoUtcInstantSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/,
    "must be an ISO 8601 UTC instant (Z suffix)",
  );

export const TrustRecordV1Schema = z
  .object({
    schemaVersion: z.literal(DTR_SCHEMA_VERSION),
    asset: z
      .object({
        sha256: sha256HexSchema,
        mimeType: z.string().min(1),
        sizeBytes: z.number().int().positive(),
        filename: z.string().min(1).max(255).optional(),
      })
      .strict(),
    analysis: z
      .object({
        summary: z.string().min(1).max(1200),
        classification: z.enum(DOCUMENT_TAXONOMY_V1),
        /** ISO 639-1 language detected in the document. */
        language: z.string().regex(/^[a-z]{2}$/),
      })
      .strict(),
    provenance: z
      .object({
        provider: z.string().min(1),
        model: z.string().min(1),
        modelVersion: z.string().min(1),
        promptVersion: z.string().min(1),
        taxonomyVersion: z.literal("v1"),
        analyzedAt: isoUtcInstantSchema,
      })
      .strict(),
    issuedAt: isoUtcInstantSchema,
  })
  .strict();

export type TrustRecordV1 = z.infer<typeof TrustRecordV1Schema>;

/**
 * Parses an untrusted value into a TrustRecordV1.
 * Returns the typed record or a list of human-readable issues — never throws.
 */
export function parseTrustRecord(
  value: unknown,
):
  | { ok: true; record: TrustRecordV1 }
  | { ok: false; issues: string[] } {
  const result = TrustRecordV1Schema.safeParse(value);
  if (result.success) {
    return { ok: true, record: result.data };
  }
  const issues = result.error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
  return { ok: false, issues };
}
