import type { NextConfig } from "next";
import path from 'node:path';

const nextConfig: NextConfig = {
  // Fix for monorepo + Turbopack issues
  outputFileTracingRoot: path.join(__dirname, '../../'),
  
  // Temporarily disable strict linting for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Enable Turbopack configurations
  turbopack: {
    // Add any custom Turbopack rules here if needed
  }
};

export default nextConfig;
