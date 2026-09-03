import type { NextConfig } from "next";
import { prelaunchMode } from "./lib/env";
import { buildSecurityHeaders } from "./lib/security-headers";

const securityHeaders = buildSecurityHeaders(
  process.env,
  process.env.NODE_ENV === "development",
);

const imageRemotePatterns: URL[] = [];
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    imageRemotePatterns.push(
      new URL(
        "/storage/v1/object/public/offer-media/**",
        process.env.NEXT_PUBLIC_SUPABASE_URL,
      ),
    );
  } catch {
    // publicSupabaseConfig reports the invalid environment at runtime.
  }
}

if (prelaunchMode()) {
  securityHeaders.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: imageRemotePatterns,
  },
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
