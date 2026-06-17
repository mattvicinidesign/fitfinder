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

    document.documentElement.dataset.capacitor = "native";

    let touchStartY = 0;

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    /** Block iOS WKWebView rubber-band when pulling past scroll extents. */
    const onTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const scroller = target.closest("[data-app-scroll-y]");
      if (!(scroller instanceof HTMLElement)) return;

      const touchY = event.touches[0]?.clientY ?? 0;
      const deltaY = touchY - touchStartY;
      const { scrollTop, scrollHeight, clientHeight } = scroller;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

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

    return () => {
      delete document.documentElement.dataset.capacitor;
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      remove?.();
    };
  }, [router]);

  return null;
}
