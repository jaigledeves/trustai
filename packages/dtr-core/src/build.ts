/**
 * Builders that assemble an UNVALIDATED Trust Record candidate from flat,
 * storage-shaped fields (e.g. database columns). Always pass the result
 * through `parseAnyTrustRecord` before hashing: missing values are passed
 * through as-is on purpose so parsing reports them instead of hiding them.
 */

import { DTR_SCHEMA_VERSION, DTR_SCHEMA_VERSION_V2 } from "./schema.js";

type Nullable<T> = T | null | undefined;

/** Flat inputs shared by every schema version. */
export interface TrustRecordFields {
  /** ISO 8601 UTC instant. */
  issuedAt: string;
  asset: {
    sha256: string;
    mimeType: string;
    sizeBytes: number;
    /** Omitted from the record when null, undefined or empty. */
    filename?: Nullable<string>;
  };
  analysis: {
    summary: Nullable<string>;
    classification: Nullable<string>;
    language: Nullable<string>;
  };
  provenance: {
    provider: Nullable<string>;
    model: Nullable<string>;
    modelVersion: Nullable<string>;
    promptVersion: Nullable<string>;
    taxonomyVersion: Nullable<string>;
    /** ISO 8601 UTC instant (e.g. `date.toISOString()`). */
    analyzedAt: Nullable<string>;
  };
}

function filenamePart(filename: Nullable<string>): { filename?: string } {
  return filename ? { filename } : {};
}

function analysisPart(fields: TrustRecordFields) {
  const { summary, classification, language } = fields.analysis;
  return { summary, classification, language };
}

function provenancePart(fields: TrustRecordFields) {
  const { provider, model, modelVersion, promptVersion, taxonomyVersion, analyzedAt } =
    fields.provenance;
  return { provider, model, modelVersion, promptVersion, taxonomyVersion, analyzedAt };
}

/** dtr-1 candidate, with the same field mapping the API has always used. */
export function buildTrustRecordV1Candidate(fields: TrustRecordFields) {
  return {
    schemaVersion: DTR_SCHEMA_VERSION,
    asset: {
      sha256: fields.asset.sha256,
      mimeType: fields.asset.mimeType,
      sizeBytes: fields.asset.sizeBytes,
      ...filenamePart(fields.asset.filename),
    },
    analysis: analysisPart(fields),
    provenance: provenancePart(fields),
    issuedAt: fields.issuedAt,
  };
}

/** dtr-2 candidate; `enrichment.asset` is `{}` when there is no filename. */
export function buildTrustRecordV2Candidate(fields: TrustRecordFields) {
  return {
    schemaVersion: DTR_SCHEMA_VERSION_V2,
    issuedAt: fields.issuedAt,
    core: {
      asset: {
        sha256: fields.asset.sha256,
        mimeType: fields.asset.mimeType,
        sizeBytes: fields.asset.sizeBytes,
      },
    },
    enrichment: {
      asset: filenamePart(fields.asset.filename),
      analysis: analysisPart(fields),
      provenance: provenancePart(fields),
    },
  };
}

/**
 * Builds the candidate for a stored `schemaVersion`. dtr-2 gets the split
 * shape; any other value keeps the dtr-1 shape with that version string,
 * so an unknown version is rejected by parsing rather than silently
 * rewritten.
 */
export function buildTrustRecordCandidate(
  schemaVersion: string,
  fields: TrustRecordFields,
): unknown {
  if (schemaVersion === DTR_SCHEMA_VERSION_V2) {
    return buildTrustRecordV2Candidate(fields);
  }
  return { ...buildTrustRecordV1Candidate(fields), schemaVersion };
}
