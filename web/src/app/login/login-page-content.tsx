"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { IosLargeTitle } from "@/components/ui/ios-large-title";
import {
  screenShellClass,
  StickyScreenBody,
  StickyScreenHeader,
} from "@/components/ui/sticky-bottom-cta";
import { SIGNUP_PATH } from "@/lib/app-session";

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
      <div className={screenShellClass}>
        <StickyScreenHeader>
          <IosLargeTitle title="Sign in" subtitle="Magic link or guest session." />
        </StickyScreenHeader>
        <StickyScreenBody className="px-4 py-6">
          <LoginForm />
        </StickyScreenBody>
      </div>
    </Suspense>
  );
}
