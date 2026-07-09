/**
 * Spanish strings for the certify wizard (web-certify-wizard): upload →
 * review → confirm → anchor → poll to CERTIFIED. RNF-041: every user-facing
 * string comes from here, never an inline JSX literal.
 */
export const certifyDictionary = {
  upload: {
    title: "Certificar un documento",
    dropLabel: "Elegí un archivo PDF para certificar",
    submit: "Subir documento",
    errorNotPdf: "Solo se aceptan archivos PDF.",
    errorSizeWarning:
      "Este archivo es grande — la subida puede tardar más de lo habitual.",
    duplicateNotice:
      "Ya existe un documento igual certificado en tu organización. Te llevamos al registro existente.",
    errorGeneric: "No pudimos subir el documento. Probá de nuevo.",
  },
  review: {
    title: "Revisión de IA",
    summaryLabel: "Resumen",
    classificationLabel: "Clasificación",
    languageLabel: "Idioma",
    save: "Guardar cambios",
    saved: "Cambios guardados.",
    analysisInProgress: "Analizando el documento… esto puede tardar unos segundos.",
    analysisFailedTitle: "No pudimos analizar este documento",
    editConflict:
      "El estado del documento cambió mientras editabas. Actualizamos la vista con los datos más recientes.",
  },
  confirm: {
    submit: "Confirmar certificación",
    frozenHashLabel: "Hash canónico (evidencia congelada)",
    errorGeneric:
      "Todavía no se puede certificar: falta completar el análisis o el estado no lo permite.",
  },
  anchor: {
    submit: "Anclar en blockchain",
    anchoringMessage: "Anclando en la blockchain… esto puede tardar unos minutos.",
    certifiedMessage: "¡Documento certificado! Podés inspeccionar la transacción on-chain.",
    explorerLinkLabel: "Ver transacción en el explorador",
    failedMessage:
      "El anclaje falló. El equipo de soporte ya fue notificado — no hace falta reintentar manualmente.",
    errorGeneric: "No se pudo anclar en este momento.",
  },
  discard: {
    action: "Descartar borrador",
    confirmPrompt:
      "¿Seguro que querés descartar este borrador? Esta acción no se puede deshacer.",
    errorGeneric: "No se pudo descartar el borrador.",
  },
} as const;
