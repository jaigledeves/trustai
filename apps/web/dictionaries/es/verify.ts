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
    badge: "Verificación pública · Cualquiera puede comprobarlo",
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
    anchoredBadge: "Anclado en blockchain",
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
    // Always-visible plain-language summary (spec: web-public-verify —
    // "Corrected eIDAS Disclaimer... Plain-Language Summary Visible by
    // Default"). The full legal text below moves behind a `<details>`
    // disclosure triggered by `disclaimerFullLabel`.
    disclaimerSummary:
      "Esto comprueba que el documento no fue alterado y desde cuándo existe. No es una firma electrónica con validez legal por sí sola.",
    disclaimerFullLabel: "Ver nota legal completa",
    // PENDING legal sign-off before mainnet/production — see ADR-009
    disclaimer:
      "Esta verificación no constituye una firma electrónica cualificada según el Reglamento eIDAS (UE 910/2014). Ancrux certifica únicamente la integridad del documento y los metadatos de procesamiento registrados en el momento de la certificación.",
    // Always-visible, non-badge honesty disclosure (design.md decision #8 —
    // "Testnet honesty on verify"): the network name moves out of the
    // prominent `page.badge` per spec, but pilot/testnet status must not go
    // silent — it stays one supporting line away, never gated behind a click.
    networkNote:
      "Durante el piloto, el anclaje se realiza en una red de prueba (Base Sepolia).",
  },
  upload: {
    panelTitle: "Verifícalo tú mismo",
    panelDescription:
      "Sube tu copia del archivo. Ancrux la compara con el registro certificado y, en paralelo, tu navegador recalcula la huella de forma independiente del servidor.",
    fileLabel: "Elige el archivo a verificar",
    dropzoneHint: "o arrástralo aquí",
    fileSizeLabel: "Tamaño: {size}",
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
        "El archivo coincide con el documento certificado, pero su anclaje en la blockchain todavía está siendo procesado.",
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
    title: "Huella calculada en tu navegador",
    hashLabel: "Huella del archivo subido",
    caveatLabel: "¿Qué comprueba este cálculo?",
    caveat:
      "Esto demuestra el cálculo independiente de la huella del archivo en tu navegador — no reconstruye ni verifica la huella canónica anclada en la blockchain. Para una verificación completa y reproducible, consulta la documentación de dtr-core.",
    error:
      "No pudimos calcular la huella en tu navegador. Es posible que el cálculo criptográfico no esté disponible en este contexto (por ejemplo, fuera de una conexión segura).",
  },
  /** Link-specific "broken/expired" copy for `/verify/[id]`, replacing the generic `shellDictionary.errors.notFound`. */
  notFound: {
    title: "No encontramos este registro de verificación.",
    description: "El enlace puede ser incorrecto o el registro ya no está disponible.",
    homeLinkLabel: "Ir a Ancrux",
  },
} as const;
