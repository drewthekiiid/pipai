import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow build to ignore type errors and ESLint errors in production
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable experimental features for large uploads
  experimental: {
    largePageDataBytes: 128 * 1024, // 128KB
  },
  /* config options here */
};

export default nextConfig;
