/**
 * public-verification spec (RF-045) "Plain-Language Verdict With eIDAS
 * Disclaimer": every verdict returned by `VerifyDocumentUseCase` MUST
 * carry this exact string. Kept as the single source of truth in its own
 * file (tasks.md task 3.2, design.md open question) so a future copy
 * change — pending product/legal sign-off — touches exactly one place.
 */
export const EIDAS_DISCLAIMER =
  "This verification does not constitute a qualified electronic signature under eIDAS; " +
  "it certifies document integrity and authorship metadata recorded by Ancrux.";
