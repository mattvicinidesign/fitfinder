"use client";

import { Suspense } from "react";
import { LoginForm } from "@/app/login/login-form";
import { IosLargeTitle } from "@/components/ui/ios-large-title";

export function LoginPageContent() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col overflow-y-auto">
        <IosLargeTitle title="Sign in" subtitle="Magic link or guest session." />
        <div className="flex-1 px-4 py-6">
          <LoginForm />
        </div>
      </div>
    </Suspense>
  );
}
