import { describe, expect, it } from "vitest";
import { computeCanonicalHash, isSha256Hex, sha256Hex } from "../src/hash.js";

describe("sha256Hex", () => {
  it("matches the NIST test vector for 'abc'", async () => {
    await expect(sha256Hex("abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("matches the NIST test vector for the empty string", async () => {
    await expect(sha256Hex("")).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes bytes and strings identically for the same payload", async () => {
    const asString = await sha256Hex("trustai");
    const asBytes = await sha256Hex(new TextEncoder().encode("trustai"));
    expect(asBytes).toBe(asString);
  });
});

describe("computeCanonicalHash", () => {
  it("is insensitive to property order (the whole point)", async () => {
    const a = await computeCanonicalHash({ x: 1, y: [true, "z"] });
    const b = await computeCanonicalHash({ y: [true, "z"], x: 1 });
    expect(a).toBe(b);
  });

  it("changes when any value changes", async () => {
    const a = await computeCanonicalHash({ x: 1 });
    const b = await computeCanonicalHash({ x: 2 });
    expect(a).not.toBe(b);
  });
});

describe("isSha256Hex", () => {
  it("accepts lowercase 64-char hex", () => {
    expect(isSha256Hex("a".repeat(64))).toBe(true);
  });

  it("rejects uppercase, short and non-hex strings", () => {
    expect(isSha256Hex("A".repeat(64))).toBe(false);
    expect(isSha256Hex("a".repeat(63))).toBe(false);
    expect(isSha256Hex("g".repeat(64))).toBe(false);
  });
});
