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
    subtitle:
      "Tus Registros Digitales de Confianza: documentos que certificaste y quedaron anclados en la blockchain para que cualquiera compruebe que no fueron alterados.",
    columnDocument: "Documento",
    columnClassification: "Clasificación",
    columnState: "Estado",
    columnCreatedAt: "Fecha de creación",
    classificationPending: "Sin clasificar",
    emptyState: "Todavía no certificaste ningún documento.",
    emptyStateCta: "Certificar mi primer documento",
    searchLabel: "Buscar por documento",
    searchPlaceholder: "Buscar por nombre de documento…",
    stateFilterLabel: "Filtrar por estado",
    stateFilterAll: "Todos los estados",
    noMatches: "Ningún documento coincide con tu búsqueda.",
    paginationPrevious: "Anterior",
    paginationNext: "Siguiente",
    /** Template — `{page}`/`{totalPages}` are substituted in the component. */
    paginationPosition: "Página {page} de {totalPages}",
  },
  detail: {
    title: "Detalle del DTR",
    stateLabel: "Estado",
    canonicalHashLabel: "Huella del registro",
    canonicalHashPending: "Todavía no se generó (el documento no fue confirmado).",
    aiSummaryLabel: "Resumen",
    aiClassificationLabel: "Clasificación",
    aiLanguageLabel: "Idioma",
    aiPending: "El análisis de IA todavía no está disponible.",
    anchorTitle: "Registro en blockchain",
    anchorNotAnchored: "Este documento todavía no fue anclado en la blockchain.",
    anchorExplorerLinkLabel: "Ver transacción en el explorador",
  },
  publicShare: {
    title: "Verificación pública",
    description:
      "Comparte este enlace o escanea el código QR para verificar la autenticidad del documento, sin necesidad de una cuenta.",
    urlLabel: "Enlace de verificación",
    openLinkLabel: "Abrir verificación pública",
    qrTitle: "Código QR de verificación pública",
    copyLabel: "Copiar enlace",
    copiedLabel: "¡Copiado!",
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
