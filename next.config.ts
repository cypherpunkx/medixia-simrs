import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true, // Enable automatic Gzip and Brotli compression for API payloads and assets
  poweredByHeader: false, // Security best practice and eliminates unnecessary header bytes
  experimental: {
    // Next.js 15 optimization
  },
};

export default nextConfig;
