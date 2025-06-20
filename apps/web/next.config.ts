import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow build to ignore type errors and ESLint errors in production
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configure external packages for serverless functions
  experimental: {
    serverComponentsExternalPackages: ['@aws-sdk/client-s3'],
  },
  /* config options here */
};

export default nextConfig;
