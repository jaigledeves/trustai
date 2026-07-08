/**
 * design.md "pg-boss Jobs" table — single source of truth for queue names,
 * shared by producers (use cases enqueueing) and consumers (job handlers),
 * avoiding a circular import between `anchor-dtr.handler.ts` (which
 * enqueues `confirm-anchor` on success) and `confirm-anchor.handler.ts`
 * (which re-enqueues `anchor-dtr` on timeout).
 */
export const ANALYZE_DOCUMENT_QUEUE = "analyze-document";
export const ANCHOR_DTR_QUEUE = "anchor-dtr";
export const CONFIRM_ANCHOR_QUEUE = "confirm-anchor";
