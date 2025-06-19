import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow build to ignore type errors and ESLint errors in production
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configure external packages (moved from experimental to stable in Next.js 15)
  serverExternalPackages: ['@aws-sdk/client-s3', '@temporalio/client'],
  
  // Note: File uploads should use presigned URLs for direct S3 upload
  // to avoid Vercel's 4.5MB serverless function payload limit
  
  /* config options here */
};

export default nextConfig;
