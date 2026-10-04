import type { NextConfig } from "next";
import { config } from "./lib/config";
import { apiOriginWarning, buildSecurityHeaders, rpcOriginWarning } from "./lib/security-headers";

const isProduction = process.env.NODE_ENV === "production";
const cspWarnings = [
  apiOriginWarning({ rawPublicApiBaseUrl: process.env["NEXT_PUBLIC_API_BASE_URL"], isProduction }),
  rpcOriginWarning({ rawChainRpcUrl: process.env["NEXT_PUBLIC_CHAIN_RPC_URL"], isProduction }),
];
for (const warning of cspWarnings) {
  if (warning) console.warn(`[security-headers] ${warning}`);
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        // NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_CHAIN_RPC_URL are read when
        // the config loads (build time), so they must be set at build on
        // Vercel for the CSP to allow the API and the chain RPC.
        headers: buildSecurityHeaders({
          publicApiBaseUrl: config.publicApiBaseUrl,
          chainRpcUrl: config.chainRpcUrl,
          isDevelopment: process.env.NODE_ENV === "development",
        }),
      },
    ];
  },
};

export default nextConfig;
