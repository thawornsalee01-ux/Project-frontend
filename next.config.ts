import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/compare/:path*",
        destination: "http://compare:8000/:path*",
      },
      {
        source: "/api/history/:path*",
        destination: "http://history:8001/:path*",
      },
    ];
  },
};

export default nextConfig;
