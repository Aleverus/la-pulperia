import type { NextConfig } from "next";
import { prelaunchMode } from "./lib/env";
import { buildSecurityHeaders } from "./lib/security-headers";

const securityHeaders = buildSecurityHeaders(
  process.env,
  process.env.NODE_ENV === "development",
);

if (prelaunchMode()) {
  securityHeaders.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
