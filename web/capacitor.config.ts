import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fitfinder.app",
  appName: "Fit Finder",
  webDir: "out",
  ios: {
    contentInset: "automatic",
    scheme: "Fit Finder",
  },
  server: {
    // Deep link host for in-app routes when opened via fitfinder://
    hostname: "fitfinder.app",
    androidScheme: "https",
  },
};

export default config;
