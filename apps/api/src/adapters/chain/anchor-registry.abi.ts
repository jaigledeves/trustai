/**
 * `AnchorRegistry` ABI — re-exported from `@trustai/dtr-core`, the single
 * source of truth shared with the browser verifier and the CLI (phase C,
 * C1). It is declared `as const` there, so viem keeps full type inference
 * for `simulateContract`/`readContract` calls in this adapter.
 */
export { ANCHOR_REGISTRY_ABI } from "@trustai/dtr-core";
