"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativePlatform } from "@/lib/platform";

/**
 * Maps fitfinder:// deep links into in-app routes (e.g. magic-link auth).
 */
export function CapacitorBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let remove: (() => void) | undefined;

    void (async () => {
      try {
        const { App } = await import("@capacitor/app");

        const handleUrl = (url: string) => {
          if (!url.includes("auth-callback")) return;
          const normalized = url.replace(/^fitfinder:\/\//, "https://local/");
          const parsed = new URL(normalized);
          const path = `/auth/callback${parsed.search}${parsed.hash}`;
          router.replace(path);
        };

        const launch = await App.getLaunchUrl();
        if (launch?.url) handleUrl(launch.url);

        const sub = await App.addListener("appUrlOpen", ({ url }) => {
          handleUrl(url);
        });
        remove = () => sub.remove();
      } catch {
        // Web-only dev without native plugins.
      }
    })();

    return () => remove?.();
  }, [router]);

  return null;
}
