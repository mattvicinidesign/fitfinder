"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PROTECTED_PREFIXES } from "@/lib/navigation";
import { AppFrame } from "@/components/app-shell/app-frame";
import { AppTabBar } from "@/components/app-shell/app-tab-bar";
import { QaResumeWarmup } from "@/components/qa-resume-warmup";

/**
 * Canonical app chrome: centered phone-width frame + iOS tab bar on every platform.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const isPreview = pathname === "/preview";
  const needsAuth =
    !isPreview &&
    PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (needsAuth && !signedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, needsAuth, signedIn, pathname, router]);

  if (!ready) {
    return (
      <AppFrame>
        <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      </AppFrame>
    );
  }

  if (needsAuth && !signedIn) {
    return null;
  }

  return (
    <AppFrame>
      <QaResumeWarmup signedIn={signedIn} />
      <div className="flex min-h-dvh flex-1 flex-col">
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
        <AppTabBar />
      </div>
    </AppFrame>
  );
}
