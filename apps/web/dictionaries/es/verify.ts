/**
 * Spanish strings for the public verify page (web-public-verify): the
 * hash-only landing card, the upload/verdict panel, and the client-side
 * hash recompute panel. RNF-041: every user-facing UI string comes from
 * here, never an inline JSX literal.
 *
 * `verdicts` copy is deliberately distinct from the backend's own
 * `explanation`/`disclaimer` DTO fields (which the API returns in English —
 * see `VerifyDocumentUseCase`'s `EXPLANATIONS`/`EIDAS_DISCLAIMER`): those
 * are rendered as raw server data under Spanish labels (same pattern as
 * `DtrDetailCard` rendering `record.aiSummary` regardless of its
 * language), while `verdicts` below are this app's own Spanish-authored
 * copy for each of the four `VerifyVerdict` states (spec: "Upload
 * Verdict, All Four States" — `ASSET_MISMATCH`'s message is the exact
 * spec-quoted string).
 */
export const verifyDictionary = {
  page: {
    title: "Verificación pública de documento",
    disabledMessage: "La verificación pública no está disponible en este momento.",
  },
  landing: {
    integrityValidLabel: "Integridad confirmada",
    integrityInvalidLabel: "Integridad no confirmada",
    explanationLabel: "Explicación",
    disclaimerLabel: "Aviso legal",
    verifiedAtLabel: "Verificado el",
    anchorExplorerLinkLabel: "Ver transacción en el explorador",
    anchorNotAnchoredLabel: "Este registro todavía no fue anclado en la blockchain.",
  },
  upload: {
    fileLabel: "Elegí el archivo a verificar",
    submitLabel: "Verificar documento",
    errorGeneric: "No pudimos verificar el documento. Probá de nuevo.",
  },
  /** Mirrors `VerificationAttemptVerdict` (apps/api) 1:1 — every verdict must have copy. */
  verdicts: {
    VALID: {
      title: "Válido",
      message:
        "El documento subido coincide con el registro certificado y su anclaje en la blockchain está confirmado.",
    },
    ASSET_MISMATCH: {
      title: "No coincide",
      message: "El documento no corresponde a este DTR o fue alterado.",
    },
    PENDING_ANCHOR: {
      title: "Anclaje pendiente",
      message:
        "El documento coincide con el registro certificado, pero todavía está pendiente la confirmación en la blockchain.",
    },
    INVALID_RECORD: {
      title: "Registro inválido",
      message: "No existe un registro certificado válido para este identificador.",
    },
  },
  analysis: {
    summaryLabel: "Resumen",
    classificationLabel: "Clasificación",
    languageLabel: "Idioma",
  },
  recompute: {
    title: "Hash calculado en tu navegador",
    hashLabel: "Hash SHA-256 del archivo subido",
    caveat:
      "Esto demuestra el cálculo independiente del hash del archivo en tu navegador — no reconstruye ni verifica el hash canónico anclado en la blockchain. Para una verificación completa y reproducible, consultá la documentación de dtr-core.",
    error:
      "No pudimos calcular el hash en tu navegador. Es posible que el cálculo criptográfico no esté disponible en este contexto (por ejemplo, fuera de una conexión segura).",
  },
} as const;
