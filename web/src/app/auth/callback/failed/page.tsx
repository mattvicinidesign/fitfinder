"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DEFAULT_APP_ROUTE } from "@/lib/app-session";

function AuthCallbackFailedContent() {
  const params = useSearchParams();
  const message =
    params.get("message") ??
    "Could not complete sign-in. Open the link in the same browser where you requested it.";
  const next = params.get("next") ?? DEFAULT_APP_ROUTE;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-[20px] font-semibold text-foreground">
        Sign-in link expired
      </h1>
      <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
        {message}
      </p>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
        Request a new email from the same device and browser, then open that link
        here without switching apps.
      </p>
      <Link
        href={next}
        className="mt-2 text-[14px] font-medium text-primary underline-offset-4 hover:underline"
      >
        Continue to app
      </Link>
    </main>
  );
}

export default function AuthCallbackFailedPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
          Loading…
        </main>
      }
    >
      <AuthCallbackFailedContent />
    </Suspense>
  );
}
