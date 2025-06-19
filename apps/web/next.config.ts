import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow build to ignore type errors and ESLint errors in production
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Updated configuration for Next.js 15
  serverExternalPackages: ['sharp'],
  experimental: {
    // Enable larger uploads and longer processing time
    largePageDataBytes: 256 * 1024, // 256KB
  },
  /* config options here */
};

export default nextConfig;
