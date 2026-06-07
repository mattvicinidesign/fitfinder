import type { NextConfig } from "next";

const isCapacitor = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  // Static export for Capacitor iOS; standard build for Vercel (SSR + proxy).
  output: isCapacitor ? "export" : undefined,
  images: {
    unoptimized: isCapacitor,
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/saved", permanent: true },
      { source: "/login", destination: "/home", permanent: false },
    ];
  },
};

export default nextConfig;
