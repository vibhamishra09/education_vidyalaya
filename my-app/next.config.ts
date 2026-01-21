import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No rewrites needed - Lightsail handles /blog routing
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
