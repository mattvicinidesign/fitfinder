"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PROTECTED_PREFIXES } from "@/lib/navigation";
import { isNativePlatform } from "@/lib/platform";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { AppBottomNav } from "@/components/app-shell/app-bottom-nav";

/**
 * Shared app chrome: sidebar (desktop) + bottom tabs (mobile / Capacitor iOS).
 * Client-side auth gate for Capacitor static builds; web also uses proxy.ts.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const needsAuth = PROTECTED_PREFIXES.some(
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
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (needsAuth && !signedIn) {
    return null;
  }

  return (
    <div className="flex min-h-dvh">
      <AppSidebar />
      <div className="flex min-h-dvh flex-1 flex-col md:min-h-0">
        <header className="md:hidden flex h-14 items-center border-b px-4 shrink-0">
          <span className="font-semibold tracking-tight">Fit Finder</span>
        </header>
        <main
          className={
            isNativePlatform()
              ? "flex-1 overflow-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))]"
              : "flex-1 overflow-auto pb-16 md:pb-0"
          }
        >
          {children}
        </main>
        <AppBottomNav />
      </div>
    </div>
  );
}
