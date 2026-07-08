import type { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";
import { AesGcmAdapter, InvalidEncryptionKeyError } from "./aes-gcm.adapter";

// 32 raw bytes ("0123456789abcdef0123456789abcdef"), base64-encoded — same
// shape as apps/api/.env.example's ASSET_ENCRYPTION_KEY.
const VALID_KEY_B64 = Buffer.from("0123456789abcdef0123456789abcdef", "utf8").toString("base64");

function fakeConfigService(key: string | undefined): ConfigService {
  return {
    get: (_name: string, fallback?: string) => key ?? fallback,
  } as unknown as ConfigService;
}

describe("AesGcmAdapter (EncryptionPort)", () => {
  it("encrypt then decrypt round-trips the exact original plaintext", async () => {
    const adapter = new AesGcmAdapter(fakeConfigService(VALID_KEY_B64));
    const plaintext = Buffer.from("certification-flow encryption roundtrip test");

    const ciphertext = await adapter.encrypt(plaintext);
    const decrypted = await adapter.decrypt(ciphertext);

    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it("produces ciphertext that does not contain the plaintext bytes (INV-12: blob is unreadable without the key)", async () => {
    const adapter = new AesGcmAdapter(fakeConfigService(VALID_KEY_B64));
    const plaintext = Buffer.from("this is a sensitive PDF payload marker XYZ");

    const ciphertext = await adapter.encrypt(plaintext);

    expect(ciphertext.includes(plaintext)).toBe(false);
  });

  it("encrypting the same plaintext twice produces different ciphertexts (random IV per call)", async () => {
    const adapter = new AesGcmAdapter(fakeConfigService(VALID_KEY_B64));
    const plaintext = Buffer.from("same input, different ciphertext each time");

    const first = await adapter.encrypt(plaintext);
    const second = await adapter.encrypt(plaintext);

    expect(first.equals(second)).toBe(false);
  });

  it("throws on decrypt when the ciphertext has been tampered with (GCM auth tag detects it)", async () => {
    const adapter = new AesGcmAdapter(fakeConfigService(VALID_KEY_B64));
    const plaintext = Buffer.from("integrity-protected payload");
    const ciphertext = await adapter.encrypt(plaintext);

    const tampered = Buffer.from(ciphertext);
    // Flip a byte well past the IV+authTag header, inside the actual ciphertext.
    tampered[tampered.length - 1] = tampered[tampered.length - 1]! ^ 0xff;

    await expect(adapter.decrypt(tampered)).rejects.toThrow();
  });

  it("throws on decrypt when the auth tag itself has been tampered with", async () => {
    const adapter = new AesGcmAdapter(fakeConfigService(VALID_KEY_B64));
    const plaintext = Buffer.from("integrity-protected payload 2");
    const ciphertext = await adapter.encrypt(plaintext);

    const tampered = Buffer.from(ciphertext);
    tampered[20] = tampered[20]! ^ 0xff; // inside the 16-byte auth tag region

    await expect(adapter.decrypt(tampered)).rejects.toThrow();
  });

  it("fails fast at construction when ASSET_ENCRYPTION_KEY is missing", () => {
    expect(() => new AesGcmAdapter(fakeConfigService(undefined))).toThrow(
      InvalidEncryptionKeyError,
    );
  });

  it("fails fast at construction when ASSET_ENCRYPTION_KEY does not decode to exactly 32 bytes", () => {
    const shortKey = Buffer.from("too-short").toString("base64");
    expect(() => new AesGcmAdapter(fakeConfigService(shortKey))).toThrow(
      InvalidEncryptionKeyError,
    );
  });
});
