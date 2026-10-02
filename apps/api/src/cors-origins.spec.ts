import { describe, expect, it } from "vitest";
import { DEFAULT_CORS_ORIGINS, resolveCorsOrigins } from "./cors-origins";

describe("resolveCorsOrigins", () => {
  it("falls back to the local web origin when CORS_ORIGINS is unset", () => {
    expect(resolveCorsOrigins(undefined)).toStrictEqual({
      origins: [...DEFAULT_CORS_ORIGINS],
      usedFallback: true,
    });
  });

  it("falls back to the local web origin when CORS_ORIGINS is blank", () => {
    expect(resolveCorsOrigins("  ")).toStrictEqual({
      origins: [...DEFAULT_CORS_ORIGINS],
      usedFallback: true,
    });
  });

  it("parses a comma-separated list, trimming entries and dropping empty ones", () => {
    expect(resolveCorsOrigins(" https://ancrux.vercel.app , ,http://localhost:3100 ")).toStrictEqual({
      origins: ["https://ancrux.vercel.app", "http://localhost:3100"],
      usedFallback: false,
    });
  });

  it("strips trailing slashes, which a browser Origin header never carries", () => {
    expect(resolveCorsOrigins("https://ancrux.vercel.app/").origins).toStrictEqual([
      "https://ancrux.vercel.app",
    ]);
  });

  it("lowercases origins, since browsers send a lowercase scheme and host", () => {
    expect(resolveCorsOrigins("HTTPS://Ancrux.Vercel.App").origins).toStrictEqual([
      "https://ancrux.vercel.app",
    ]);
  });

  it("ignores a wildcard and keeps the explicit origins", () => {
    expect(resolveCorsOrigins("*,https://ancrux.vercel.app")).toStrictEqual({
      origins: ["https://ancrux.vercel.app"],
      usedFallback: false,
    });
  });

  it("treats a wildcard-only value as unset", () => {
    expect(resolveCorsOrigins("*")).toStrictEqual({
      origins: [...DEFAULT_CORS_ORIGINS],
      usedFallback: true,
    });
  });
});
