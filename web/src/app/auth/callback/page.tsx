import { Suspense } from "react";
import { AuthCallbackClient } from "@/app/auth/callback/auth-callback-client";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
          Signing you in…
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
