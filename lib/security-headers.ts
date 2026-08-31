type RuntimeEnv = Record<string, string | undefined>;

export type SecurityHeader = { key: string; value: string };

export function buildSecurityHeaders(
  env: RuntimeEnv,
  development: boolean,
): SecurityHeader[] {
  const supabaseOrigin = httpOrigin(env.NEXT_PUBLIC_SUPABASE_URL);
  const mapOrigin = httpOrigin(env.NEXT_PUBLIC_PMTILES_URL);
  const protomapsOrigin = "https://protomaps.github.io";
  const externalOrigins = unique([
    protomapsOrigin,
    supabaseOrigin,
    mapOrigin,
  ]);
  const hasInsecureRuntimeOrigin = externalOrigins.some((origin) =>
    origin.startsWith("http:"),
  );
  const connectSources = [
    "'self'",
    ...externalOrigins,
    ...(development ? ["ws:"] : []),
  ];
  const mediaSources = ["'self'", "data:", "blob:", ...externalOrigins];
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${mediaSources.join(" ")}`,
    `media-src ${mediaSources.join(" ")}`,
    `font-src 'self' data: ${protomapsOrigin}`,
    `connect-src ${connectSources.join(" ")}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(development || hasInsecureRuntimeOrigin
      ? []
      : ["upgrade-insecure-requests"]),
  ];

  return [
    {
      key: "Content-Security-Policy",
      value: directives.join("; "),
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(self)",
    },
  ];
}

function httpOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
