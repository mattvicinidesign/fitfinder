import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fitfinder.app",
  appName: "Fit Finder",
  webDir: "out",
  ios: {
    // iPhone-only: TARGETED_DEVICE_FAMILY = 1 in ios/App/App.xcodeproj (not iPad).
    // Portrait only — see Info.plist UISupportedInterfaceOrientations.
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
