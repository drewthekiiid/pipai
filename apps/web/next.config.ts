import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow build to ignore type errors and ESLint errors in production
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Increase body size limits for construction document uploads
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Increase limit for large construction documents
    },
    responseLimit: '50mb',
  },
  /* config options here */
};

export default nextConfig;
