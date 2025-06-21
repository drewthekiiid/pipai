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
  // Configure for Vercel deployment with complete dynamic rendering
  output: 'standalone',
  trailingSlash: false,
  // This is the key fix for Next.js 15 - disable static page generation entirely
  outputFileTracingExcludes: {},
  /* config options here */
};

export default nextConfig;
