export {
  canonicalize,
  CanonicalizationError,
  type JsonValue,
} from "./canonicalize.js";
export { sha256Hex, computeCanonicalHash, isSha256Hex } from "./hash.js";
export {
  DTR_SCHEMA_VERSION,
  DTR_SCHEMA_VERSION_V2,
  SUPPORTED_DTR_SCHEMA_VERSIONS,
  DOCUMENT_TAXONOMY_V1,
  TrustRecordV1Schema,
  TrustRecordV2Schema,
  TrustRecordSchema,
  Dtr2CoreAssetSchema,
  Dtr2ProofSchema,
  parseTrustRecord,
  parseAnyTrustRecord,
  type DocumentClass,
  type TrustRecordV1,
  type TrustRecordV2,
  type TrustRecord,
  type Dtr2CoreAsset,
  type Dtr2Proof,
} from "./schema.js";
export {
  computeDtr2CoreHash,
  computeDtr2AnchorHash,
  computeDtr2Hashes,
  computeAnchoredHash,
  type Dtr2Hashes,
} from "./dtr2-hash.js";
export {
  buildTrustRecordCandidate,
  buildTrustRecordV1Candidate,
  buildTrustRecordV2Candidate,
  type TrustRecordFields,
} from "./build.js";
export {
  verifyAssetAgainstRecord,
  verifyDtr2Proof,
  type VerificationResult,
  type Dtr2ProofResult,
} from "./verify.js";
export {
  ANCHOR_REGISTRY_ABI,
  ANCHOR_REGISTRY_DEPLOYMENTS,
  BASE_SEPOLIA_ANCHOR_REGISTRY,
  type AnchorRegistryDeployment,
} from "./anchor-registry.js";
