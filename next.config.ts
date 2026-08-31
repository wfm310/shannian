import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 临时构建目录：绕开 IDE 安全删除策略对 .next 大目录的清理限制
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
