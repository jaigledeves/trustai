/**
 * Spanish strings for the DTR history list and detail views (web-history):
 * list table, empty state, and detail card copy, plus a shared Spanish
 * label per `TrustRecordState` (used by both the list badges and the
 * detail card). RNF-041: every user-facing string comes from here, never
 * an inline JSX literal.
 */
export const historyDictionary = {
  list: {
    title: "Mis DTR",
    columnId: "ID",
    columnState: "Estado",
    columnCreatedAt: "Fecha de creación",
    emptyState: "Todavía no certificaste ningún documento.",
  },
  detail: {
    title: "Detalle del DTR",
    stateLabel: "Estado",
    canonicalHashLabel: "Hash canónico",
    canonicalHashPending: "Todavía no se generó (el documento no fue confirmado).",
    aiSummaryLabel: "Resumen",
    aiClassificationLabel: "Clasificación",
    aiLanguageLabel: "Idioma",
    aiPending: "El análisis de IA todavía no está disponible.",
    anchorTitle: "Anclaje en blockchain",
    anchorNotAnchored: "Este documento todavía no fue anclado.",
    anchorExplorerLinkLabel: "Ver transacción en el explorador",
  },
  /** Mirrors `TrustRecordState` (lib/api/types.ts) 1:1 — every state must have a label. */
  states: {
    DRAFT: "Borrador",
    READY: "Listo para anclar",
    ANCHORING: "Anclando",
    CERTIFIED: "Certificado",
    FAILED: "Falló",
    DISCARDED: "Descartado",
  },
} as const;
