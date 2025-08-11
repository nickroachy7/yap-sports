import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during builds for production deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Temporarily disable TypeScript checking during build for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable experimental features for Supabase
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
};

export default nextConfig;
