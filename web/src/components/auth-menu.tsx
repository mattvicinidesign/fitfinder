"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { requestSignupFlow } from "@/lib/app-session";
import { ensureGuestSession } from "@/lib/ensure-guest-session";

interface Props {
  layout?: "header" | "sidebar";
  email?: string | null;
  isGuest?: boolean;
  signedIn?: boolean;
}

export function AuthMenu({
  layout = "header",
  email: emailProp,
  isGuest: isGuestProp,
  signedIn: signedInProp,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(emailProp ?? null);
  const [isGuest, setIsGuest] = useState(isGuestProp ?? false);
  const [signedIn, setSignedIn] = useState(signedInProp ?? false);

  useEffect(() => {
    if (signedInProp !== undefined) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setSignedIn(!!u);
      setEmail(u?.email ?? null);
      setIsGuest(u?.is_anonymous ?? false);
    });
  }, [signedInProp]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    await ensureGuestSession();
    router.refresh();
    router.push("/home");
  }

  function openSignup() {
    requestSignupFlow();
    router.push("/home?signup=1");
  }

  if (!signedIn) {
    return null;
  }

  if (layout === "sidebar") {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground truncate text-xs">
          {isGuest ? "Guest session" : email}
        </p>
        {isGuest ? (
          <Button size="sm" variant="outline" className="w-full" onClick={openSignup}>
            Save account
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="ml-2 flex items-center gap-2">
      <span className="text-muted-foreground hidden sm:inline text-xs">
        {isGuest ? "Guest" : email}
      </span>
      {isGuest ? (
        <Button size="sm" variant="outline" onClick={openSignup}>
          Save account
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={signOut}>
          Sign out
        </Button>
      )}
    </div>
  );
}
