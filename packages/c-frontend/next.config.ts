import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // 允许从本地 API 服务加载图片（开发环境）
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3030', pathname: '/api/uploads/**' },
      { protocol: 'http', hostname: 'localhost', port: '3030', pathname: '/uploads/**' },
    ],
  },
  // Expose WS toggle/URL to client
  env: {
    NEXT_PUBLIC_WS_ENABLED: process.env.NEXT_PUBLIC_WS_ENABLED ?? "true",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3030",
  },
};

export default nextConfig;
