export const TEXT_EXTRACTION_PORT = Symbol("TextExtractionPort");

/**
 * RF-023 (out of scope): no OCR. When a PDF has zero extractable text, the
 * adapter throws this instead of returning an empty string, so the caller
 * (AnalyzeDocumentHandler) can surface an explicit, visible failure reason
 * instead of silently passing empty text to the AI provider.
 */
export class NoTextLayerError extends Error {
  constructor() {
    super("PDF has no extractable text layer (scanned PDFs are not supported in MVP — no OCR)");
    this.name = "NoTextLayerError";
  }
}

export interface TextExtractionPort {
  /** @throws {NoTextLayerError} when the PDF has no extractable text. */
  extractText(pdfBytes: Buffer): Promise<string>;
}
