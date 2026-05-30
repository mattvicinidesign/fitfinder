"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for a sign-in link.");
    }
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
    <Card>
      <CardHeader>
        <CardTitle>Sign in to Fit Finder</CardTitle>
        <CardDescription>
          Use a magic link to keep your analyses synced across devices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={sendMagicLink} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? "Sending…" : "Send magic link"}
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <Button variant="outline" className="w-full" onClick={continueAsGuest}>
          Continue as guest
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Guest analyses are saved to a temporary anonymous session.
        </p>
      </CardContent>
    </Card>
  );
}
