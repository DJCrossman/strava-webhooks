import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a self-contained server bundle for slim Docker images.
  output: "standalone",
  reactCompiler: true,
  images: {
    // Strava athlete avatars are served from CloudFront.
    remotePatterns: [
      { protocol: "https", hostname: "dgalywyr863hv.cloudfront.net" },
    ],
  },
};

export default nextConfig;
