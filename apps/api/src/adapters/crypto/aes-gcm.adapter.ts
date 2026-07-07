import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { EncryptionPort } from "../../ports/encryption.port";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 32;

export class InvalidEncryptionKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidEncryptionKeyError";
  }
}

export class DecryptionAuthenticationError extends Error {
  constructor() {
    super("Ciphertext failed GCM authentication (tampered or wrong key)");
    this.name = "DecryptionAuthenticationError";
  }
}

/**
 * AES-256-GCM via `node:crypto` (design.md "Encryption boundary" + "Key
 * management (MVP)" decisions). Single 32-byte key from `ASSET_ENCRYPTION_KEY`
 * (base64), loaded once at construction and kept only in memory — never
 * logged. Output blob layout: `[12-byte IV][16-byte authTag][ciphertext]`,
 * self-contained so `StoragePort` never needs to know about it.
 */
@Injectable()
export class AesGcmAdapter implements EncryptionPort {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const base64Key = configService.get<string>("ASSET_ENCRYPTION_KEY");
    if (!base64Key) {
      throw new InvalidEncryptionKeyError("ASSET_ENCRYPTION_KEY is not configured");
    }

    const key = Buffer.from(base64Key, "base64");
    if (key.length !== KEY_LENGTH_BYTES) {
      throw new InvalidEncryptionKeyError(
        `ASSET_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH_BYTES} bytes (got ${key.length})`,
      );
    }
    this.key = key;
  }

  async encrypt(plaintext: Buffer): Promise<Buffer> {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]);
  }

  async decrypt(blob: Buffer): Promise<Buffer> {
    const iv = blob.subarray(0, IV_LENGTH_BYTES);
    const authTag = blob.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
    const ciphertext = blob.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    try {
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
      throw new DecryptionAuthenticationError();
    }
  }
}
