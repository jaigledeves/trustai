import { describe, expect, it } from "vitest";
import { DEFAULT_CORS_ORIGINS, resolveCorsOrigins } from "./cors-origins";

describe("resolveCorsOrigins", () => {
  it("falls back to the local web origin when CORS_ORIGINS is unset", () => {
    expect(resolveCorsOrigins(undefined)).toStrictEqual(DEFAULT_CORS_ORIGINS);
  });

  it("falls back to the local web origin when CORS_ORIGINS is blank", () => {
    expect(resolveCorsOrigins("  ")).toStrictEqual(DEFAULT_CORS_ORIGINS);
  });

  it("parses a comma-separated list, trimming entries and dropping empty ones", () => {
    expect(resolveCorsOrigins(" https://ancrux.vercel.app , ,http://localhost:3100 ")).toStrictEqual([
      "https://ancrux.vercel.app",
      "http://localhost:3100",
    ]);
  });

  it("never allows every origin", () => {
    expect(resolveCorsOrigins("*")).not.toContain("*");
  });
});
