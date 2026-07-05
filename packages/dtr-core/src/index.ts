export {
  canonicalize,
  CanonicalizationError,
  type JsonValue,
} from "./canonicalize.js";
export { sha256Hex, computeCanonicalHash, isSha256Hex } from "./hash.js";
export {
  DTR_SCHEMA_VERSION,
  DOCUMENT_TAXONOMY_V1,
  TrustRecordV1Schema,
  parseTrustRecord,
  type DocumentClass,
  type TrustRecordV1,
} from "./schema.js";
export {
  verifyAssetAgainstRecord,
  type VerificationResult,
} from "./verify.js";
