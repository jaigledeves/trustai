import type { NextConfig } from "next";
import { config } from "./lib/config";
import { buildSecurityHeaders } from "./lib/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        // NEXT_PUBLIC_API_BASE_URL is read when the config loads (build time),
        // so it must be set at build on Vercel for the CSP to allow the API.
        headers: buildSecurityHeaders({
          publicApiBaseUrl: config.publicApiBaseUrl,
          isDevelopment: process.env.NODE_ENV === "development",
        }),
      },
    ];
  },
};

export default nextConfig;
