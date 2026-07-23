"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { nativeAuthCallbackPath } from "@/lib/auth-redirect";
import { markAuthDeepLinkPending } from "@/lib/app-session";
import { isNativePlatform } from "@/lib/platform";

/** Survives full document loads (navigateApp) within the same WebView session. */
const HANDLED_AUTH_LAUNCH_URL_KEY = "fitfinder-handled-auth-launch-url";

function hasHandledAuthUrl(url: string): boolean {
  try {
    return sessionStorage.getItem(HANDLED_AUTH_LAUNCH_URL_KEY) === url;
  } catch {
    return false;
  }
}

function markAuthUrlHandled(url: string): void {
  try {
    sessionStorage.setItem(HANDLED_AUTH_LAUNCH_URL_KEY, url);
  } catch {
    // Private mode / quota — still navigate; worst case is a one-time re-entry.
  }
}

/**
 * Maps fitfinder:// deep links into in-app routes (e.g. magic-link auth).
 * Uses client-side routing only — full page loads break the launch overlay.
 *
 * Important: App.getLaunchUrl() keeps returning the URL that opened the app.
 * Closing a report uses navigateApp → full reload → this bridge remounts.
 * Without deduping, we'd re-open /auth/callback ("Signing you in…") every time.
 */
export function CapacitorBridge() {
  const router = useRouter();

  useLayoutEffect(() => {
    if (!isNativePlatform()) return;

    document.documentElement.dataset.capacitor = "native";

    let remove: (() => void) | undefined;

    void (async () => {
      try {
        const { App } = await import("@capacitor/app");

        const handleUrl = (url: string) => {
          const path = nativeAuthCallbackPath(url);
          if (!path) return;
          if (hasHandledAuthUrl(url)) return;
          markAuthUrlHandled(url);
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

    return () => {
      delete document.documentElement.dataset.capacitor;
      remove?.();
    };
  }, [router]);

  return null;
}
