import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  isPdf,
  resolveMaxUploadBytes,
  uploadMulterOptions,
} from "./upload-limits";

describe("resolveMaxUploadBytes", () => {
  const previous = process.env["MAX_UPLOAD_BYTES"];

  afterEach(() => {
    if (previous === undefined) {
      delete process.env["MAX_UPLOAD_BYTES"];
    } else {
      process.env["MAX_UPLOAD_BYTES"] = previous;
    }
  });

  it("defaults to 10 MB", () => {
    expect(DEFAULT_MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });

  it("uses the default when MAX_UPLOAD_BYTES is unset", () => {
    delete process.env["MAX_UPLOAD_BYTES"];
    expect(resolveMaxUploadBytes()).toBe(DEFAULT_MAX_UPLOAD_BYTES);
  });

  it("honors a positive integer override, trimming whitespace", () => {
    process.env["MAX_UPLOAD_BYTES"] = " 2048 ";
    expect(resolveMaxUploadBytes()).toBe(2048);
  });

  it.each(["", "   ", "abc", "0", "-5", "1.5"])(
    "falls back to the default for invalid value %j",
    (value) => {
      process.env["MAX_UPLOAD_BYTES"] = value;
      expect(resolveMaxUploadBytes()).toBe(DEFAULT_MAX_UPLOAD_BYTES);
    },
  );
});

describe("uploadMulterOptions", () => {
  it("limits uploads to a single file of at most the resolved size", () => {
    // busboy rejects a file once it reaches `fileSize`, hence the +1.
    expect(uploadMulterOptions.limits).toEqual({
      fileSize: DEFAULT_MAX_UPLOAD_BYTES + 1,
      files: 1,
    });
  });
});

describe("isPdf", () => {
  it("accepts a buffer starting with the %PDF- signature", () => {
    expect(isPdf(Buffer.from("%PDF-1.7\n%âãÏÓ\n"))).toBe(true);
  });

  it("rejects an empty buffer", () => {
    expect(isPdf(Buffer.alloc(0))).toBe(false);
  });

  it("rejects a buffer shorter than the signature", () => {
    expect(isPdf(Buffer.from("%PDF"))).toBe(false);
  });

  it("rejects a PNG signature", () => {
    expect(isPdf(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(false);
  });

  it("rejects a buffer whose %PDF- signature is not at offset 0", () => {
    expect(isPdf(Buffer.from("junk%PDF-1.7"))).toBe(false);
  });
});
