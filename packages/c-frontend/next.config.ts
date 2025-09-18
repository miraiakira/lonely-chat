import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Expose WS toggle/URL to client
  env: {
    NEXT_PUBLIC_WS_ENABLED: process.env.NEXT_PUBLIC_WS_ENABLED ?? "true",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3030",
  },
};

export default nextConfig;
