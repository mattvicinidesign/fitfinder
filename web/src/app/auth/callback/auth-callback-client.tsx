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

/**
 * Native iOS magic-link callback (Capacitor static export has no route.ts).
 * Web uses /auth/callback/route.ts for PKCE exchange on Vercel and dev.
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? DEFAULT_APP_ROUTE;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlError = params.get("error");
    if (urlError) {
      setError(urlError);
      return;
    }

    // Web: legacy links land on /auth/callback — forward to the server handler.
    if (!isNativePlatform()) {
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      if (code || (tokenHash && type)) {
        window.location.replace(`/api/auth/callback?${params.toString()}`);
      }
      return;
    }

    const supabase = createClient();

    async function finish() {
      async function completeAuth() {
        markLaunchFlowComplete();
        markAppSessionActive();
        await applyPendingSignupProfile();
        clearAuthDeepLinkPending();
        router.replace(next);
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
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
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) {
            setError(sessionError.message);
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

  if (!isNativePlatform()) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 text-sm text-muted-foreground">
        Signing you in…
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 text-sm text-muted-foreground">
      {error ?? "Signing you in…"}
    </main>
  );
}
