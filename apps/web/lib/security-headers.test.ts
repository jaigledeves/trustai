import { describe, expect, it } from "vitest";
import { apiOriginWarning, buildSecurityHeaders, rpcOriginWarning } from "./security-headers";

function headerMap(
  options: Parameters<typeof buildSecurityHeaders>[0],
): Map<string, string> {
  return new Map(buildSecurityHeaders(options).map((h) => [h.key, h.value]));
}

function cspDirectives(csp: string): Map<string, string> {
  return new Map(
    csp.split(";").map((d) => {
      const [name = "", ...values] = d.trim().split(/\s+/);
      return [name, values.join(" ")];
    }),
  );
}

const production = {
  publicApiBaseUrl: "https://api.ancrux.example/v1/",
  chainRpcUrl: "https://sepolia.base.org",
  isDevelopment: false,
};

describe("buildSecurityHeaders", () => {
  it("sets the framing, sniffing, referrer and permissions headers", () => {
    const headers = headerMap(production);

    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    const permissions = headers.get("Permissions-Policy") ?? "";
    for (const feature of ["camera", "microphone", "geolocation", "payment", "usb"]) {
      expect(permissions).toContain(`${feature}=()`);
    }
  });

  it("allows the browser to reach the API origin derived from NEXT_PUBLIC_API_BASE_URL", () => {
    const csp = cspDirectives(headerMap(production).get("Content-Security-Policy") ?? "");

    expect(csp.get("connect-src")).toBe(
      "'self' https://api.ancrux.example https://sepolia.base.org",
    );
  });

  it("allows the browser to reach the chain RPC origin from NEXT_PUBLIC_CHAIN_RPC_URL", () => {
    const csp = cspDirectives(
      headerMap({ ...production, chainRpcUrl: "https://rpc.example.org/v2/key-path" }).get(
        "Content-Security-Policy",
      ) ?? "",
    );

    expect(csp.get("connect-src")).toBe("'self' https://api.ancrux.example https://rpc.example.org");
  });

  it("lists a shared API and RPC origin once", () => {
    const csp = cspDirectives(
      headerMap({ ...production, chainRpcUrl: "https://api.ancrux.example/rpc" }).get(
        "Content-Security-Policy",
      ) ?? "",
    );

    expect(csp.get("connect-src")).toBe("'self' https://api.ancrux.example");
  });

  it("forbids framing, plugins, foreign forms and base-uri changes", () => {
    const csp = cspDirectives(headerMap(production).get("Content-Security-Policy") ?? "");

    expect(csp.get("default-src")).toBe("'self'");
    expect(csp.get("frame-ancestors")).toBe("'none'");
    expect(csp.get("frame-src")).toBe("'none'");
    expect(csp.get("object-src")).toBe("'none'");
    expect(csp.get("base-uri")).toBe("'self'");
    expect(csp.get("form-action")).toBe("'self'");
    expect(csp.get("img-src")).toBe("'self' data: blob:");
    expect(csp.get("font-src")).toBe("'self' data:");
    expect(csp.get("style-src")).toBe("'self' 'unsafe-inline'");
  });

  it("allows 'unsafe-eval' only in development", () => {
    const prodCsp = cspDirectives(headerMap(production).get("Content-Security-Policy") ?? "");
    const devCsp = cspDirectives(
      headerMap({ ...production, isDevelopment: true }).get("Content-Security-Policy") ?? "",
    );

    expect(prodCsp.get("script-src")).toBe("'self' 'unsafe-inline'");
    expect(devCsp.get("script-src")).toBe("'self' 'unsafe-inline' 'unsafe-eval'");
  });

  it("falls back to 'self' only when neither the API nor the RPC URL is valid", () => {
    const csp = cspDirectives(
      headerMap({ publicApiBaseUrl: "not a url", chainRpcUrl: "nope", isDevelopment: false }).get(
        "Content-Security-Policy",
      ) ?? "",
    );

    expect(csp.get("connect-src")).toBe("'self'");
  });
});

describe("apiOriginWarning", () => {
  it("warns in production when NEXT_PUBLIC_API_BASE_URL is unset", () => {
    expect(apiOriginWarning({ rawPublicApiBaseUrl: undefined, isProduction: true })).toMatch(
      /NEXT_PUBLIC_API_BASE_URL/,
    );
  });

  it("warns in production when the value is not a valid URL", () => {
    expect(apiOriginWarning({ rawPublicApiBaseUrl: "not a url", isProduction: true })).toMatch(
      /NEXT_PUBLIC_API_BASE_URL/,
    );
  });

  it("stays silent in production with a valid URL", () => {
    expect(
      apiOriginWarning({ rawPublicApiBaseUrl: "https://api.example.com", isProduction: true }),
    ).toBeUndefined();
  });

  it("stays silent outside production", () => {
    expect(apiOriginWarning({ rawPublicApiBaseUrl: undefined, isProduction: false })).toBeUndefined();
  });
});

describe("rpcOriginWarning", () => {
  it("warns in production when NEXT_PUBLIC_CHAIN_RPC_URL is set but not a valid URL", () => {
    expect(rpcOriginWarning({ rawChainRpcUrl: "not a url", isProduction: true })).toMatch(
      /NEXT_PUBLIC_CHAIN_RPC_URL/,
    );
  });

  it("stays silent when unset, since the Base Sepolia default applies", () => {
    expect(rpcOriginWarning({ rawChainRpcUrl: undefined, isProduction: true })).toBeUndefined();
  });

  it("stays silent with a valid URL or outside production", () => {
    expect(
      rpcOriginWarning({ rawChainRpcUrl: "https://sepolia.base.org", isProduction: true }),
    ).toBeUndefined();
    expect(rpcOriginWarning({ rawChainRpcUrl: "not a url", isProduction: false })).toBeUndefined();
  });
});
