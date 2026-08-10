/**
 * Spanish strings for the certify wizard (web-certify-wizard): upload →
 * review → confirm → anchor → poll to CERTIFIED. RNF-041: every user-facing
 * string comes from here, never an inline JSX literal.
 */
export const certifyDictionary = {
  stepper: {
    uploadLabel: "Subida",
    analysisLabel: "Análisis de IA",
    reviewLabel: "Revisión",
    anchorLabel: "Anclaje",
    certifiedLabel: "Certificado",
  },
  documentContext: {
    filenameFallback: "Documento sin nombre de archivo",
    sizeLabel: "Tamaño",
    uploadedAtLabel: "Subido el",
  },
  navigation: {
    backToList: "Volver a mis DTR",
  },
  upload: {
    title: "Certificar un documento",
    dropLabel: "Elige un archivo PDF para certificar",
    dropHint: "o arrástralo aquí",
    fileSizeLabel: "Tamaño: {size}",
    submit: "Subir documento",
    errorNotPdf: "Solo se aceptan archivos PDF.",
    errorSizeWarning:
      "Este archivo es grande — la subida puede tardar más de lo habitual.",
    duplicateNotice:
      "Ya existe un documento igual certificado en tu organización. Te llevamos al registro existente.",
    errorGeneric: "No pudimos subir el documento. Prueba de nuevo.",
  },
  review: {
    title: "Revisión de IA",
    summaryLabel: "Resumen",
    classificationLabel: "Clasificación",
    languageLabel: "Idioma",
    save: "Guardar cambios",
    saved: "Cambios guardados.",
    analysisInProgress: "Analizando el documento… esto puede tardar unos segundos.",
    analysisSlow:
      "El análisis está tardando más de lo esperado y dejamos de actualizar esta página automáticamente. Recarga la página para ver si ya terminó, o descarta el borrador.",
    analysisFailedTitle: "No pudimos analizar este documento",
    editConflict:
      "El estado del documento cambió mientras editabas. Actualizamos la vista con los datos más recientes.",
  },
  /**
   * Localized replacements for `record.analysisFailureReason` (RNF-041):
   * that field is sourced from a backend job's raw `output.message`
   * (untranslated, English) and MUST never be rendered directly. Only
   * `noTextLayer`/`noContent` map known literal API strings 1:1; anything
   * else (dynamic Zod-issue messages, defensive not-found errors, or a
   * missing reason) resolves to `generic`.
   */
  analysisError: {
    noTextLayer:
      "El documento no tiene texto extraíble. Por ahora solo se admiten PDFs con texto, no imágenes escaneadas.",
    noContent: "El proveedor de IA no devolvió contenido para este documento. Inténtalo de nuevo.",
    generic: "No se pudo analizar el documento.",
  },
  confirm: {
    submit: "Confirmar certificación",
    frozenHashLabel: "Huella del registro",
    frozenHashDisclosureLabel: "¿Qué es esta huella?",
    frozenHashDisclosure:
      "Es el hash SHA-256 de la serialización canónica (RFC 8785) del Registro Digital de Confianza. Queda anclado en la blockchain y sirve como evidencia irrefutable de que el contenido no fue alterado.",
    errorGeneric:
      "Todavía no se puede certificar: falta completar el análisis o el estado no lo permite.",
  },
  anchor: {
    submit: "Finalizar certificación",
    anchoringMessage: "Anclando tu documento en la blockchain… esto puede tardar unos minutos.",
    certifiedMessage: "¡Documento certificado! Puedes ver el comprobante en la blockchain.",
    explorerLinkLabel: "Ver transacción en el explorador",
    retryingMessage:
      "El anclaje no se confirmó en el tiempo previsto y se está reintentando automáticamente. No hace falta que hagas nada.",
    slowMessage:
      "El anclaje está tardando más de lo esperado y dejamos de actualizar esta página automáticamente. Recarga la página para comprobar si ya se completó.",
    errorGeneric: "No se pudo anclar en este momento.",
    viewDetailAction: "Ver detalle",
    backToListAction: "Volver a mis DTR",
  },
  discard: {
    action: "Descartar borrador",
    dialogTitle: "¿Descartar este borrador?",
    cancel: "Cancelar",
    confirmAction: "Sí, descartar",
    confirmPrompt:
      "¿Seguro que quieres descartar este borrador? Esta acción no se puede deshacer.",
    discardedMessage: "Este borrador fue descartado.",
    errorGeneric: "No se pudo descartar el borrador.",
    certifyAnotherAction: "Certificar otro documento",
    backToListAction: "Volver a mis DTR",
  },
} as const;
