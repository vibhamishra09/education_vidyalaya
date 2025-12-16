import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export configuration
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'be.dev.webyalaya.com',
      },
      {
        protocol: 'https',
        hostname: '**.webyalaya.com',
      },
    ],
  },
};

export default nextConfig;
