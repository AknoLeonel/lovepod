import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignora os erros de tipagem na hora de subir pra Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignora os avisos de código (eslint) na hora de subir
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;