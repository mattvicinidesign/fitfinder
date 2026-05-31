"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { nativeAuthCallbackPath } from "@/lib/auth-redirect";
import { markAuthDeepLinkPending } from "@/lib/app-session";
import { isNativePlatform } from "@/lib/platform";

/**
 * Maps fitfinder:// deep links into in-app routes (e.g. magic-link auth).
 * Uses client-side routing only — full page loads break the launch overlay.
 */
export function CapacitorBridge() {
  const router = useRouter();

  useLayoutEffect(() => {
    if (!isNativePlatform()) return;

    let remove: (() => void) | undefined;

    void (async () => {
      try {
        const { App } = await import("@capacitor/app");

        const handleUrl = (url: string) => {
          const path = nativeAuthCallbackPath(url);
          if (!path) return;
          markAuthDeepLinkPending();
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
