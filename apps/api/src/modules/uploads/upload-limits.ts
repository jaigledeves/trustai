import type { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";

export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const PDF_SIGNATURE = Buffer.from("%PDF-", "ascii");

/**
 * Maximum accepted upload size in bytes, from `MAX_UPLOAD_BYTES`. Unset,
 * blank, non-integer or non-positive values fall back to the default, with
 * the same validation as `resolveAuthThrottleLimit`: `Number("")` is 0
 * (every upload would be rejected) and `Number("abc")` is NaN (multer would
 * stop enforcing the limit).
 */
export function resolveMaxUploadBytes(): number {
  const raw = process.env["MAX_UPLOAD_BYTES"]?.trim();
  if (!raw) return DEFAULT_MAX_UPLOAD_BYTES;
  const bytes = Number(raw);
  return Number.isInteger(bytes) && bytes >= 1 ? bytes : DEFAULT_MAX_UPLOAD_BYTES;
}

/**
 * Multer options shared by every `FileInterceptor`. Decorator arguments are
 * evaluated once at class-definition time and multer takes a plain number
 * (no per-request resolver), so `MAX_UPLOAD_BYTES` is read once at module
 * load: changing it requires a restart. Multer aborts the stream as soon as
 * the limit is crossed, so an oversized body is never fully buffered, and
 * `@nestjs/platform-express` maps its `LIMIT_FILE_SIZE` error to a 413
 * `PayloadTooLargeException`. Busboy reports the limit as soon as the file
 * reaches `fileSize` bytes (it cannot tell whether more data follows), so
 * the multer limit is one byte above the maximum to accept a file of exactly
 * `MAX_UPLOAD_BYTES`.
 */
export const uploadMulterOptions: MulterOptions = {
  limits: { fileSize: resolveMaxUploadBytes() + 1, files: 1 },
};

/**
 * True when the buffer starts with the PDF header signature (`%PDF-`) at
 * offset 0. The client-declared MIME type is not trusted on its own.
 */
export function isPdf(buffer: Buffer): boolean {
  return (
    buffer.length >= PDF_SIGNATURE.length &&
    buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)
  );
}
