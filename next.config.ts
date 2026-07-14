import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/scrape": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
