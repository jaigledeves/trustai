/**
 * SHA-256 hashing over the Web Crypto API.
 *
 * Web Crypto (`globalThis.crypto.subtle`) is available in every modern
 * browser and in Node.js >= 18, which lets this module run unchanged in
 * the web app, the API and the public verification CLI (RNF-032).
 */

import { canonicalize } from "./canonicalize.js";

const HEX_64 = /^[0-9a-f]{64}$/;

/** Returns the lowercase hex SHA-256 digest of a string or byte payload. */
export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return toHex(new Uint8Array(digest));
}

/**
 * Computes the canonical hash of a Trust Record: SHA-256 over its
 * RFC 8785 canonical serialization (ADR-001). This is the value that
 * gets anchored on-chain (directly or as a Merkle leaf).
 */
export async function computeCanonicalHash(record: unknown): Promise<string> {
  return sha256Hex(canonicalize(record));
}

/** Type guard for lowercase 64-char hex digests (SHA-256). */
export function isSha256Hex(value: string): boolean {
  return HEX_64.test(value);
}

function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}
