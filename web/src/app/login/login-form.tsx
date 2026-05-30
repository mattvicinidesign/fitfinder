"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IosGroupedRow, IosGroupedSection } from "@/components/ui/ios-grouped-section";
import { isNativePlatform } from "@/lib/platform";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/analyze";

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const supabase = createClient();
    const redirectBase = isNativePlatform()
      ? "fitfinder://auth-callback"
      : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${redirectBase}?next=${encodeURIComponent(next)}`,
      },
    });
    setSending(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for a sign-in link.");
  }

  async function continueAsGuest() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={sendMagicLink}>
        <IosGroupedSection title="Email">
          <IosGroupedRow className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 text-[17px] bg-transparent border-0 shadow-none px-0 focus-visible:ring-0"
              />
            </div>
          </IosGroupedRow>
        </IosGroupedSection>
        <div className="mt-4">
          <Button type="submit" className="w-full h-12 rounded-xl" disabled={sending}>
            {sending ? "Sending…" : "Send magic link"}
          </Button>
        </div>
      </form>

      <Button variant="outline" className="w-full h-11 rounded-xl" onClick={continueAsGuest}>
        Continue as guest
      </Button>
      <p className="text-center text-[13px] text-muted-foreground">
        Guest analyses use a temporary anonymous session.
      </p>
    </div>
  );
}
