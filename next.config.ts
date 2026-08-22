import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    middlewareClientMaxBodySize: "21mb",
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [{
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
    }];
  },
  async redirects() {
    return [
      { source: "/qr", destination: "/", permanent: true },
      { source: "/qr/:slug", destination: "/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
