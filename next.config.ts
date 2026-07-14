import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverActions: {
    bodySizeLimit: "500mb",
  },
  experimental: {
    middlewareClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
