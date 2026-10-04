/**
 * Trust Record schemas: dtr-1 (ADR-001) and dtr-2 (ADR-015).
 *
 * SCHEMA DISCIPLINE (ADR-001, INV-24): schemas are append-only across the
 * product's life. A new field or semantic change means a NEW schema
 * version constant and a new zod schema — existing versions are frozen
 * forever so historical DTRs keep verifying.
 */

import { z } from "zod";

export const DTR_SCHEMA_VERSION = "dtr-1" as const;

/** Trust Core + AI enrichment split (ADR-015). */
export const DTR_SCHEMA_VERSION_V2 = "dtr-2" as const;

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

// Field schemas shared by dtr-1 and dtr-2 so both versions keep exactly
// the same constraints (taxonomy v1, provenance, asset facts).
const assetSha256Schema = sha256HexSchema;
const assetMimeTypeSchema = z.string().min(1);
const assetSizeBytesSchema = z.number().int().positive();
const assetFilenameSchema = z.string().min(1).max(255);

const analysisSchema = z
  .object({
    summary: z.string().min(1).max(1200),
    classification: z.enum(DOCUMENT_TAXONOMY_V1),
    /** ISO 639-1 language detected in the document. */
    language: z.string().regex(/^[a-z]{2}$/),
  })
  .strict();

const provenanceSchema = z
  .object({
    provider: z.string().min(1),
    model: z.string().min(1),
    modelVersion: z.string().min(1),
    promptVersion: z.string().min(1),
    taxonomyVersion: z.literal("v1"),
    analyzedAt: isoUtcInstantSchema,
  })
  .strict();

export const TrustRecordV1Schema = z
  .object({
    schemaVersion: z.literal(DTR_SCHEMA_VERSION),
    asset: z
      .object({
        sha256: assetSha256Schema,
        mimeType: assetMimeTypeSchema,
        sizeBytes: assetSizeBytesSchema,
        filename: assetFilenameSchema.optional(),
      })
      .strict(),
    analysis: analysisSchema,
    provenance: provenanceSchema,
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
  return toParseResult(TrustRecordV1Schema.safeParse(value));
}

/** File facts any verifier can rebuild from the bytes alone (dtr-2 core). */
export const Dtr2CoreAssetSchema = z
  .object({
    sha256: assetSha256Schema,
    mimeType: assetMimeTypeSchema,
    sizeBytes: assetSizeBytesSchema,
  })
  .strict();

export type Dtr2CoreAsset = z.infer<typeof Dtr2CoreAssetSchema>;

/**
 * Trust Record schema, version dtr-2 (ADR-015).
 *
 * `core` holds only what is derivable from the file. `enrichment` holds the
 * upload filename, the AI analysis and its provenance.
 *
 * Rule for `enrichment.asset`: it is ALWAYS present and `filename` inside
 * it is optional, so a record without a filename has `"asset": {}`. A
 * single representation of "no filename" keeps enrichmentHash unambiguous.
 */
export const TrustRecordV2Schema = z
  .object({
    schemaVersion: z.literal(DTR_SCHEMA_VERSION_V2),
    issuedAt: isoUtcInstantSchema,
    core: z.object({ asset: Dtr2CoreAssetSchema }).strict(),
    enrichment: z
      .object({
        asset: z.object({ filename: assetFilenameSchema.optional() }).strict(),
        analysis: analysisSchema,
        provenance: provenanceSchema,
      })
      .strict(),
  })
  .strict();

export type TrustRecordV2 = z.infer<typeof TrustRecordV2Schema>;

/** Any supported Trust Record, discriminated by `schemaVersion`. */
export const TrustRecordSchema = z.discriminatedUnion("schemaVersion", [
  TrustRecordV1Schema,
  TrustRecordV2Schema,
]);

export type TrustRecord = z.infer<typeof TrustRecordSchema>;

/** Supported schema versions, oldest first. */
export const SUPPORTED_DTR_SCHEMA_VERSIONS = [
  DTR_SCHEMA_VERSION,
  DTR_SCHEMA_VERSION_V2,
] as const;

/**
 * Parses an untrusted value into any supported Trust Record version,
 * dispatching on `schemaVersion`. Never throws.
 */
export function parseAnyTrustRecord(
  value: unknown,
):
  | { ok: true; record: TrustRecord }
  | { ok: false; issues: string[] } {
  return toParseResult(TrustRecordSchema.safeParse(value));
}

/** Minimal dtr-2 proof: enough to recompute anchorHash without the AI text. */
export const Dtr2ProofSchema = z
  .object({
    schemaVersion: z.literal(DTR_SCHEMA_VERSION_V2),
    issuedAt: isoUtcInstantSchema,
    coreHash: sha256HexSchema,
    enrichmentHash: sha256HexSchema,
  })
  .strict();

export type Dtr2Proof = z.infer<typeof Dtr2ProofSchema>;

function toParseResult<T>(
  result: z.SafeParseReturnType<unknown, T>,
): { ok: true; record: T } | { ok: false; issues: string[] } {
  if (result.success) {
    return { ok: true, record: result.data };
  }
  return { ok: false, issues: formatIssues(result.error) };
}

/** Formats zod issues as `path: message` strings. */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
}
