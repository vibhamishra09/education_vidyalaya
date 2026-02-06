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
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "webyalaya-dev-media.s3.us-west-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "webyalaya-test-media-namaste.s3.us-west-2.amazonaws.com",
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
