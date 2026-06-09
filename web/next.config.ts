import type { NextConfig } from "next";

const isCapacitor = process.env.CAPACITOR_BUILD === "true";

/** Fail Vercel/production builds early when Supabase env is missing. */
function assertProductionEnv() {
  if (isCapacitor || process.env.NODE_ENV !== "production") return;

  const missing = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Add them in Vercel → Settings → Environment Variables (see web/VERCEL.md).`,
    );
  }
}

assertProductionEnv();

/** Splash QA on Vercel Preview deploys; override with NEXT_PUBLIC_ENABLE_SPLASH_QA. */
const splashQaPublicFlag =
  process.env.NEXT_PUBLIC_ENABLE_SPLASH_QA ??
  (process.env.VERCEL_ENV === "preview" ? "true" : "");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ENABLE_SPLASH_QA: splashQaPublicFlag,
  },
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
