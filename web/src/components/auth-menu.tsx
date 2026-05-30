"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";

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
    router.refresh();
    router.push("/login");
  }

  if (!signedIn) {
    return (
      <Link href="/login" className={buttonVariants({ size: "sm", className: layout === "header" ? "ml-2" : "w-full justify-center" })}>
        Sign in
      </Link>
    );
  }

  if (layout === "sidebar") {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground truncate text-xs">
          {isGuest ? "Guest session" : email}
        </p>
        {isGuest ? (
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}>
            Save account
          </Link>
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
        <Link href="/login" className={buttonVariants({ size: "sm", variant: "outline" })}>
          Save account
        </Link>
      ) : (
        <Button size="sm" variant="ghost" onClick={signOut}>
          Sign out
        </Button>
      )}
    </div>
  );
}
