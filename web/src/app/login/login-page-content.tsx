"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import { SIGNUP_PATH } from "@/lib/pending-signup";

function LoginOnboardingRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (params.get("next") === "/onboarding") {
      router.replace(SIGNUP_PATH);
    }
  }, [params, router]);

  return null;
}

export function LoginPageContent() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginOnboardingRedirect />
      <div className="flex h-full min-h-0 flex-col overflow-y-auto">
        <IosLargeTitle title="Sign in" subtitle="Magic link or guest session." />
        <div className="flex-1 px-4 py-6">
          <LoginForm />
        </div>
      </div>
    </Suspense>
  );
}
