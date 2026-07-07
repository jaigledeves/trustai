export const ENCRYPTION_PORT = Symbol("EncryptionPort");

/**
 * App-layer encryption applied by the use case *before* `StoragePort.putObject`
 * is called (design.md "Encryption boundary" decision) — keeps `StoragePort`
 * a dumb bytes-in/bytes-out contract and makes encryption unit-testable with
 * zero I/O. `encrypt`/`decrypt` operate on a single self-contained blob so
 * callers never need to know the adapter's internal IV/authTag layout.
 */
export interface EncryptionPort {
  encrypt(plaintext: Buffer): Promise<Buffer>;
  decrypt(ciphertext: Buffer): Promise<Buffer>;
}
