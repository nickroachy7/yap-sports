import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during builds for production deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Keep TypeScript checking enabled
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable experimental features for Supabase
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
};

export default nextConfig;
