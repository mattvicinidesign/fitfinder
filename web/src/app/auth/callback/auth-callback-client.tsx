"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyPendingSignupProfile } from "@/lib/pending-signup";
import {
  clearAuthDeepLinkPending,
  DEFAULT_APP_ROUTE,
  markAppSessionActive,
  markLaunchFlowComplete,
} from "@/lib/app-session";
import { isNativePlatform } from "@/lib/platform";

export function AuthCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? DEFAULT_APP_ROUTE;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function finish() {
      async function completeAuth() {
        markLaunchFlowComplete();
        markAppSessionActive();
        await applyPendingSignupProfile();
        clearAuthDeepLinkPending();
        if (isNativePlatform()) {
          router.replace(next);
          return;
        }
        router.replace(next);
        router.refresh();
      }

      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          return;
        }
        await completeAuth();
        return;
      }

      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            setError(error.message);
            return;
          }
          await completeAuth();
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await completeAuth();
        return;
      }

      setError("Could not complete sign-in. Try again from the login screen.");
    }

    void finish();
  }, [params, next, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 text-sm text-muted-foreground">
      {error ?? "Signing you in…"}
    </main>
  );
}
