import { describe, expect, it } from "vitest";
import { decodeMultipartFilename } from "./decode-multipart-filename";

/**
 * Simulates how multer hands us the filename: the browser sends UTF-8 bytes,
 * multer decodes them as latin1. This helper builds that exact mojibaked
 * string from a real UTF-8 name so the tests mirror production.
 */
function asMulterWouldDecode(realName: string): string {
  return Buffer.from(realName, "utf8").toString("latin1");
}

describe("decodeMultipartFilename", () => {
  it("repairs Spanish accents mangled by multer's latin1 decode", () => {
    const mangled = asMulterWouldDecode("Medio Ambiente _ EL PAÍS.pdf");
    // Sanity: the input really is mojibaked before we fix it.
    expect(mangled).not.toBe("Medio Ambiente _ EL PAÍS.pdf");
    expect(decodeMultipartFilename(mangled)).toBe("Medio Ambiente _ EL PAÍS.pdf");
  });

  it("repairs other UTF-8 characters (ñ, ü, emoji)", () => {
    const original = "Año_niño_Müller_✓.pdf";
    expect(decodeMultipartFilename(asMulterWouldDecode(original))).toBe(original);
  });

  it("leaves a plain ASCII filename untouched", () => {
    expect(decodeMultipartFilename("contract.pdf")).toBe("contract.pdf");
  });

  it("preserves a genuinely latin1 name instead of corrupting it into U+FFFD", () => {
    // A lone 0xE9 (é in latin1) is NOT valid standalone UTF-8. The safety
    // guard must keep the original rather than emit a replacement char.
    const latin1Only = Buffer.from([0x72, 0xe9, 0x73, 0x75, 0x6d, 0x65]).toString("latin1"); // "résumé"-ish bytes
    const result = decodeMultipartFilename(latin1Only);
    expect(result).toBe(latin1Only);
    expect(result).not.toContain("\uFFFD");
  });
});
