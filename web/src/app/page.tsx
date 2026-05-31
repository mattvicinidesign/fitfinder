"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativePlatform } from "@/lib/platform";

/**
 * Web entry redirects into the app shell. On native, SplashGate owns routing so
 * a mid-splash redirect does not restart the launch animation.
 */
export default function RootRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (isNativePlatform()) return;

    const target = `/home${window.location.search}${window.location.hash}`;
    router.replace(target);
  }, [router]);

  return null;
}
