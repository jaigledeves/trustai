import { Injectable } from "@nestjs/common";
import { extractText, getDocumentProxy } from "unpdf";
import { NoTextLayerError, type TextExtractionPort } from "../../ports/text-extraction.port";

/**
 * `unpdf` — serverless PDF.js build, text-layer extraction only (RF-023:
 * no OCR in MVP). design.md "Module / Folder Layout".
 */
@Injectable()
export class UnpdfTextExtractionAdapter implements TextExtractionPort {
  async extractText(pdfBytes: Buffer): Promise<string> {
    const pdf = await getDocumentProxy(new Uint8Array(pdfBytes));
    const { text } = await extractText(pdf, { mergePages: true });

    if (text.trim().length === 0) {
      throw new NoTextLayerError();
    }

    return text;
  }
}
