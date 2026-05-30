import { Suspense } from "react";
import { AppFrame } from "@/components/app-shell/app-frame";
import { LoginForm } from "@/app/login/login-form";
import { IosLargeTitle } from "@/components/ui/ios-large-title";

export default function LoginPage() {
  return (
    <AppFrame>
      <div className="flex min-h-dvh flex-col">
        <IosLargeTitle title="Sign in" subtitle="Magic link or guest session." />
        <div className="flex-1 px-4 py-6">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </AppFrame>
  );
}
