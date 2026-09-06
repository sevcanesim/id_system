import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Next.js development toolbar is useful internally, but its floating
  // "N" control overlays the public product chrome in local demos and
  // screenshots. Keep the application surface identical between review and
  // production builds.
  devIndicators: false,
  experimental: {
    proxyClientMaxBodySize: "21mb",
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compiler: {
    removeConsole: true,
  },
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      ...["/p/:path*", "/c/:path*", "/e/:path*"].map((source) => ({
        source,
        headers: [
          // QR exchange is initiated only on the public-card surfaces. Keeping
          // the allowlist here prevents the scanner from widening camera access
          // across the account, commerce, admin or API routes.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(self)" },
        ],
      })),
      ...["/odeme/paytr", "/odeme/basarili", "/odeme/basarisiz"].map((source) => ({
        source,
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      })),
    ];
  },
  async redirects() {
    return [
      { source: "/qr", destination: "/", permanent: true },
      { source: "/qr/:slug", destination: "/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
