import { describe, expect, it } from "vitest";
import { NoTextLayerError } from "../../ports/text-extraction.port";
import { UnpdfTextExtractionAdapter } from "./unpdf.adapter";

/**
 * Hand-crafted minimal single-page PDFs with byte-accurate xref offsets
 * (verified against unpdf's bundled PDF.js build) — no external fixture
 * files or extra dependencies needed just to get a parseable PDF in tests.
 */
function buildMinimalPdf(contentStream: string): Buffer {
  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    4: `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`,
    5: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  };

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf, "utf8");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

describe("UnpdfTextExtractionAdapter (TextExtractionPort)", () => {
  it("extracts text from a PDF with a text layer", async () => {
    const adapter = new UnpdfTextExtractionAdapter();
    const pdfBytes = buildMinimalPdf("BT /F1 24 Tf 50 100 Td (Hello World) Tj ET");

    const text = await adapter.extractText(pdfBytes);

    expect(text).toContain("Hello World");
  });

  it("throws NoTextLayerError for a PDF with an empty content stream (no text layer)", async () => {
    const adapter = new UnpdfTextExtractionAdapter();
    const pdfBytes = buildMinimalPdf("");

    await expect(adapter.extractText(pdfBytes)).rejects.toBeInstanceOf(NoTextLayerError);
  });

  it("throws NoTextLayerError for a PDF whose content stream draws only whitespace", async () => {
    const adapter = new UnpdfTextExtractionAdapter();
    const pdfBytes = buildMinimalPdf("BT /F1 24 Tf 50 100 Td (   ) Tj ET");

    await expect(adapter.extractText(pdfBytes)).rejects.toBeInstanceOf(NoTextLayerError);
  });
});
