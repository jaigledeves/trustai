/**
 * Multer (via `@nestjs/platform-express`) decodes the `filename` from a
 * multipart/form-data upload as **latin1**, so any non-ASCII filename that the
 * browser sent as UTF-8 bytes arrives mojibaked (e.g. "EL PAÍS" -> "EL PAÃS").
 * Because the filename is part of the canonically-hashed, on-chain-anchored
 * TrustRecord (schema.ts `asset.filename`), a wrong name here is permanent —
 * so it must be corrected at ingestion, before hashing.
 *
 * This reverses multer's latin1 decode: it takes the string's latin1 code
 * units back to their original bytes and re-decodes them as UTF-8. ASCII names
 * are unaffected (identical under both encodings). If the bytes turn out not to
 * be valid UTF-8 (a genuinely latin1 name), the original string is kept so a
 * correct name is never corrupted into replacement characters.
 */
export function decodeMultipartFilename(originalname: string): string {
  const utf8 = Buffer.from(originalname, "latin1").toString("utf8");
  // U+FFFD only appears if the latin1 bytes weren't valid UTF-8. If it wasn't
  // already in the input, the reversal was lossy — keep the original name.
  if (utf8.includes("\uFFFD") && !originalname.includes("\uFFFD")) {
    return originalname;
  }
  return utf8;
}
