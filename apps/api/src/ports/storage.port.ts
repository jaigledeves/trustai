export const STORAGE_PORT = Symbol("StoragePort");

export class ObjectNotFoundError extends Error {
  constructor(key: string) {
    super(`Object not found in storage: ${key}`);
    this.name = "ObjectNotFoundError";
  }
}

/**
 * Dumb bytes-in/bytes-out object storage. Encryption is a separate concern
 * (`EncryptionPort`, applied by the use case before `putObject` is called),
 * keeping this port a trivial in-memory-fakeable contract (design.md
 * "Encryption boundary" decision).
 */
export interface StoragePort {
  putObject(params: { key: string; body: Buffer; contentType?: string }): Promise<void>;
  getObject(key: string): Promise<Buffer>;
}
