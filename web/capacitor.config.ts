import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fitfinder.app",
  appName: "Fit Finder",
  webDir: "out",
  ios: {
    // Let CSS env(safe-area-inset-*) handle insets — "automatic" double-counts with our headers.
    contentInset: "never",
    scheme: "Fit Finder",
  },
  server: {
    // Deep link host for in-app routes when opened via fitfinder://
    hostname: "fitfinder.app",
    androidScheme: "https",
  },
  plugins: {
    // Native URLSession/OkHttp for cross-origin calls (Supabase edge functions).
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
