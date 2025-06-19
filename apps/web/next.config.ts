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
  
  // Workaround for Turbopack NEXT_PUBLIC env var issue (Next.js 15 bug)
  env: {
    NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  },
  
  /* config options here */
};

export default nextConfig;
