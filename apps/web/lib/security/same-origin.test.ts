import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { hasJsonContentType, isSameOriginRequest } from "./same-origin";

function post(headers: Record<string, string>, url = "http://localhost:3001/api/auth/login") {
  return new NextRequest(url, { method: "POST", headers, body: "{}" });
}

describe("isSameOriginRequest (CSRF guard for cookie-authenticated writes)", () => {
  it("accepts an Origin equal to the request's own origin (local dev, preview URLs)", () => {
    expect(isSameOriginRequest(post({ origin: "http://localhost:3001" }))).toBe(true);
  });

  it("accepts an Origin equal to the configured app origin (NEXT_PUBLIC_APP_BASE_URL)", () => {
    // Behind a proxy the request URL can carry an internal host; the
    // configured public origin (default http://localhost:3100) still matches.
    expect(
      isSameOriginRequest(
        post({ origin: "http://localhost:3100" }, "http://internal-host:8080/api/auth/login"),
      ),
    ).toBe(true);
  });

  it("rejects a cross-site Origin", () => {
    expect(isSameOriginRequest(post({ origin: "https://evil.example.com" }))).toBe(false);
  });

  it("rejects a same-host Origin on a different port or scheme", () => {
    expect(isSameOriginRequest(post({ origin: "http://localhost:4000" }))).toBe(false);
    expect(isSameOriginRequest(post({ origin: "https://localhost:3001" }))).toBe(false);
  });

  it("rejects an opaque 'null' Origin (sandboxed iframe, data: URL)", () => {
    expect(isSameOriginRequest(post({ origin: "null" }))).toBe(false);
  });

  it("falls back to Sec-Fetch-Site: same-origin when Origin is absent", () => {
    expect(isSameOriginRequest(post({ "sec-fetch-site": "same-origin" }))).toBe(true);
  });

  it("rejects a missing Origin when Sec-Fetch-Site is absent or not same-origin", () => {
    expect(isSameOriginRequest(post({}))).toBe(false);
    expect(isSameOriginRequest(post({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameOriginRequest(post({ "sec-fetch-site": "same-site" }))).toBe(false);
  });
});

describe("hasJsonContentType", () => {
  it.each([
    ["application/json", true],
    ["application/json; charset=utf-8", true],
    ["Application/JSON", true],
    ["text/plain", false],
    ["text/plain; charset=utf-8", false],
    ["application/x-www-form-urlencoded", false],
    ["multipart/form-data; boundary=x", false],
    ["application/jsonp", false],
  ])("%s -> %s", (contentType, expected) => {
    expect(hasJsonContentType(post({ "content-type": contentType }))).toBe(expected);
  });

  it("rejects a missing Content-Type", () => {
    const request = new NextRequest("http://localhost:3001/api/auth/login", { method: "POST" });
    expect(hasJsonContentType(request)).toBe(false);
  });
});
