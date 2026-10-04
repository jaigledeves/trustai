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
    errorTooLarge: "El archivo es demasiado grande para verificarlo.",
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
  /**
   * Independent verification (roadmap C2/C4, ADR-016): copy for the step
   * codes, facts and outcomes produced by `independent-verification.ts` in
   * `@trustai/dtr-core` (shared with the `ancrux-verify` CLI).
   * Every `StepCode`, `FactKey`, `StepId` and outcome must have an entry here.
   */
  independent: {
    panelTitle: "Verificación independiente",
    panelDescription:
      "Esta comprobación no depende de Ancrux: tu navegador recalcula las huellas y consulta la blockchain directamente.",
    fileLabel: "Elige el archivo original",
    submitLabel: "Verificar sin depender de Ancrux",
    runningLabel: "Verificando…",
    downloadProofLabel: "Descargar prueba (JSON)",
    stepsLabel: "Pasos de la verificación independiente",
    errorGeneric: "No pudimos completar la verificación independiente. Prueba de nuevo.",
    status: {
      ok: "Correcto",
      failed: "Fallido",
      skipped: "Omitido",
    },
    steps: {
      file: "Lectura del archivo",
      proof: "Prueba pública",
      coreHash: "Huella del contenido (coreHash)",
      anchorHash: "Huella anclada (anchorHash)",
      network: "Red de la blockchain",
      contract: "Contrato AnchorRegistry",
      anchored: "Anclaje en la blockchain",
    },
    codes: {
      file_pdf: "Tu navegador leyó el archivo y calculó su SHA-256. Es un PDF.",
      file_not_pdf:
        "El archivo no es un PDF (no empieza por %PDF-). Ancrux solo certifica PDF, así que la huella del contenido no puede coincidir y la verificación se detiene aquí.",
      file_too_large:
        "El archivo supera los 10 MB, el tamaño máximo que Ancrux certifica, así que no se lee ni se verifica.",
      file_unreadable: "No se pudo leer el archivo en tu navegador.",
      proof_ok: "Se descargó la prueba pública y cumple el formato ancrux-proof-1.",
      proof_not_found: "No existe un registro con este identificador.",
      proof_legacy:
        "Es un registro heredado (dtr-1): solo lo verifica el servidor de Ancrux, con la verificación de arriba.",
      proof_unavailable:
        "Este registro todavía no tiene prueba pública (por ejemplo, aún no está anclado).",
      proof_invalid: "La prueba recibida no cumple el formato ancrux-proof-1, así que no se puede usar.",
      proof_fetch_error: "No se pudo descargar la prueba pública. Prueba de nuevo.",
      proof_timeout:
        "La API de Ancrux no respondió a tiempo, así que no se pudo descargar la prueba pública. Prueba de nuevo más tarde.",
      core_match: "La huella del contenido recalculada a partir de tu archivo coincide con la de la prueba.",
      core_mismatch: "La huella del contenido recalculada no coincide: el archivo no es el certificado.",
      core_invalid:
        "No se pudo calcular la huella del contenido con los datos del archivo (por ejemplo, si está vacío).",
      anchor_hash_match:
        "La huella anclada recalculada con los datos de la prueba coincide con la declarada.",
      anchor_hash_mismatch:
        "La huella anclada recalculada no coincide con la declarada: la prueba es incoherente.",
      network_match: "El nodo RPC público responde desde la misma red que indica la prueba.",
      network_mismatch: "El nodo RPC responde desde una red distinta a la de la prueba.",
      contract_known: "La prueba apunta al contrato AnchorRegistry conocido de esta red.",
      contract_unknown:
        "Atención: la prueba apunta a un contrato desconocido. No se consulta, porque un contrato ajeno podría responder cualquier cosa.",
      anchored: "El contrato confirma que la huella anclada está registrada en la blockchain.",
      not_anchored: "El contrato indica que esta huella no está anclada.",
      rpc_error: "No se pudo consultar la red. Revisa tu conexión y prueba de nuevo.",
      skipped: "No se ejecutó porque un paso anterior no se completó.",
    },
    facts: {
      sha256: "SHA-256 del archivo",
      sizeBytes: "Tamaño (bytes)",
      mimeType: "Tipo detectado",
      coreHash: "coreHash",
      expectedCoreHash: "coreHash de la prueba",
      actualCoreHash: "coreHash recalculado",
      anchorHash: "anchorHash",
      declaredAnchorHash: "anchorHash declarado",
      computedAnchorHash: "anchorHash recalculado",
      rpcChainId: "Red del nodo RPC (chainId)",
      proofChainId: "Red de la prueba (chainId)",
      contractAddress: "Contrato de la prueba",
      knownContractAddress: "Contrato conocido",
      anchoredAt: "Anclado según la blockchain",
      proofBlockTimestamp: "Fecha del bloque según la prueba",
      txHash: "Transacción",
    },
    warnings: {
      timestamp_mismatch:
        "La fecha de anclaje en la blockchain no coincide con la que indica la prueba. El anclaje es válido; la fecha que cuenta es la de la blockchain.",
    },
    outcomes: {
      verified: {
        title: "Verificado de forma independiente",
        message:
          "Tu archivo coincide con la prueba y su huella está anclada en la blockchain. Lo comprobó tu navegador, sin depender del veredicto de Ancrux.",
      },
      failed: {
        title: "No verificado",
        message: "Al menos un paso falló. Revisa el detalle de cada paso.",
      },
      legacy: {
        title: "Registro heredado",
        message:
          "Los registros dtr-1 no admiten verificación independiente: solo los verifica el servidor de Ancrux.",
      },
      not_found: {
        title: "Registro no encontrado",
        message: "No encontramos un registro para este enlace de verificación.",
      },
      unavailable: {
        title: "Prueba no disponible",
        message: "Este registro todavía no tiene prueba pública. Prueba más tarde.",
      },
    },
  },
  /** Link-specific "broken/expired" copy for `/verify/[id]`, replacing the generic `shellDictionary.errors.notFound`. */
  notFound: {
    title: "No encontramos este registro de verificación.",
    description: "El enlace puede ser incorrecto o el registro ya no está disponible.",
    homeLinkLabel: "Ir a Ancrux",
  },
} as const;
