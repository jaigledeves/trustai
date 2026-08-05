/**
 * Spanish strings for the public verify page (web-public-verify): the
 * hash-only landing card, the upload/verdict panel, and the client-side
 * hash recompute panel. RNF-041: every user-facing UI string comes from
 * here, never an inline JSX literal.
 *
 * `verdicts` copy is deliberately distinct from the backend's own
 * `explanation`/`disclaimer` DTO fields (which the API returns in English —
 * see `VerifyDocumentUseCase`'s `EXPLANATIONS`/`EIDAS_DISCLAIMER`): those
 * are legacy-only on the wire and are never rendered (spec: "Web-Owned
 * Verdict & Legal Copy", ADR-009/Option W). This app owns its own
 * Spanish-authored copy for each of the four `VerifyVerdict` states and for
 * the eIDAS disclaimer under `legal`.
 */
export const verifyDictionary = {
  page: {
    title: "Verificación pública de documento",
    badge: "Verificación pública · Anclado en Base Sepolia",
    subtitle:
      "Nadie tiene que confiar. Se comprueba. Este es el resultado registrado en la blockchain para este documento — y abajo puedes comprobar tu propia copia.",
    disabled: {
      message: "La verificación pública no está habilitada en este momento.",
      homeLinkLabel: "Volver al inicio",
    },
  },
  cta: {
    title: "¿Quieres certificar tus propios documentos?",
    subtitle:
      "Crea una cuenta y obtén tu primer Registro Digital de Confianza verificable en minutos. Gratis durante el piloto.",
    button: "Crear cuenta gratis",
  },
  landing: {
    recordLabel: "Registro Digital de Confianza (DTR)",
    anchoredBadge: "Registrado en blockchain",
    integrityValidLabel: "Integridad confirmada",
    integrityInvalidLabel: "Integridad no confirmada",
    verifiedAtLabel: "Verificado el",
    txHashLabel: "Transacción",
    anchorExplorerLinkLabel: "Ver transacción en el explorador",
    anchorNotAnchoredLabel: "Este registro todavía no fue anclado en la blockchain.",
  },
  /**
   * Legal/compliance copy (spec: "Corrected eIDAS Disclaimer", ADR-009).
   * `disclaimer` names eIDAS and states integrity + AI-processing
   * provenance only — never an authorship/ownership claim.
   */
  legal: {
    disclaimerLabel: "Nota legal",
    // PENDING legal sign-off before mainnet/production — see ADR-009
    disclaimer:
      "Esta verificación no constituye una firma electrónica cualificada según el Reglamento eIDAS (UE 910/2014). TrustAI certifica únicamente la integridad del documento y los metadatos de procesamiento registrados en el momento de la certificación.",
  },
  upload: {
    panelTitle: "Verifícalo tú mismo",
    panelDescription:
      "Sube tu copia del archivo. TrustAI la compara con el registro certificado y, en paralelo, tu navegador recalcula el hash de forma independiente del servidor.",
    fileLabel: "Elige el archivo a verificar",
    dropzoneHint: "o arrástralo aquí",
    submitLabel: "Verificar documento",
    errorGeneric: "No pudimos verificar el documento. Prueba de nuevo.",
  },
  /** Mirrors `VerificationAttemptVerdict` (apps/api) 1:1 — every verdict must have copy. */
  verdicts: {
    VALID: {
      title: "Válido",
      message:
        "El archivo que subiste coincide exactamente con el documento certificado y su registro está confirmado en la blockchain.",
    },
    ASSET_MISMATCH: {
      title: "No coincide",
      message:
        "El archivo que subiste no coincide con el documento certificado. Puede que el contenido haya cambiado o que sea un archivo diferente.",
    },
    PENDING_ANCHOR: {
      title: "Anclaje pendiente",
      message:
        "El archivo coincide con el documento certificado, pero su registro en la blockchain todavía está siendo procesado.",
    },
    INVALID_RECORD: {
      title: "Registro inválido",
      message: "No encontramos un registro certificado válido para este enlace de verificación.",
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
    caveatLabel: "¿Qué comprueba este cálculo?",
    caveat:
      "Esto demuestra el cálculo independiente del hash del archivo en tu navegador — no reconstruye ni verifica el hash canónico anclado en la blockchain. Para una verificación completa y reproducible, consulta la documentación de dtr-core.",
    error:
      "No pudimos calcular el hash en tu navegador. Es posible que el cálculo criptográfico no esté disponible en este contexto (por ejemplo, fuera de una conexión segura).",
  },
  /** Link-specific "broken/expired" copy for `/verify/[id]`, replacing the generic `shellDictionary.errors.notFound`. */
  notFound: {
    title: "No encontramos este registro de verificación.",
    description: "El enlace puede ser incorrecto o el registro ya no está disponible.",
    homeLinkLabel: "Ir a TrustAI",
  },
} as const;
