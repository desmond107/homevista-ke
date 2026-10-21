import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy: blocks injected scripts (XSS) and framing (clickjacking).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://my.matterport.com https://kuula.co https://www.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const s3Host = process.env.S3_PUBLIC_URL ? new URL(process.env.S3_PUBLIC_URL).hostname : null;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["sharp", "@prisma/client"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(s3Host ? [{ protocol: "https" as const, hostname: s3Host }] : []),
    ],
    localPatterns: [{ pathname: "/media/**" }, { pathname: "/brand/**" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "60mb" }, // listing photos + KYC documents
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
