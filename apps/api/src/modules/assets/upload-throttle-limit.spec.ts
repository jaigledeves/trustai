import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_THROTTLE_LIMIT } from "../throttling/throttling.module";
import { DEFAULT_UPLOAD_THROTTLE_LIMIT, resolveUploadThrottleLimit } from "./assets.controller";

/**
 * ADR-012 / spec "Stricter Throttle on Asset Upload" — scenario
 * "Upload limit is stricter than the global default". The paid
 * `POST /assets` path (OpenAI) MUST always be clamped below the global
 * default so a misconfiguration can't silently open the cost path to the
 * global (looser) budget. These are pure resolver assertions — no Docker,
 * no Nest bootstrap.
 */
describe("Upload throttle limit vs global default", () => {
  const previousUpload = process.env["UPLOAD_THROTTLE_LIMIT"];

  beforeEach(() => {
    delete process.env["UPLOAD_THROTTLE_LIMIT"];
  });

  afterEach(() => {
    if (previousUpload === undefined) {
      delete process.env["UPLOAD_THROTTLE_LIMIT"];
    } else {
      process.env["UPLOAD_THROTTLE_LIMIT"] = previousUpload;
    }
  });

  it("shipped defaults keep the upload limit strictly below the global default", () => {
    expect(DEFAULT_UPLOAD_THROTTLE_LIMIT).toBeLessThan(DEFAULT_THROTTLE_LIMIT);
  });

  it("resolves to its own default when UPLOAD_THROTTLE_LIMIT is unset", () => {
    expect(resolveUploadThrottleLimit()).toBe(DEFAULT_UPLOAD_THROTTLE_LIMIT);
  });

  it("honors an explicit UPLOAD_THROTTLE_LIMIT env override", () => {
    process.env["UPLOAD_THROTTLE_LIMIT"] = "3";
    expect(resolveUploadThrottleLimit()).toBe(3);
  });

  it("a representative env config keeps the resolved upload limit below the global default", () => {
    process.env["UPLOAD_THROTTLE_LIMIT"] = "5";
    const globalLimit = Number(process.env["THROTTLE_LIMIT"] ?? DEFAULT_THROTTLE_LIMIT);
    expect(resolveUploadThrottleLimit()).toBeLessThan(globalLimit);
  });
});
