"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";

interface Props {
  email: string | null;
  isGuest: boolean;
  signedIn: boolean;
}

export function AuthMenu({ email, isGuest, signedIn }: Props) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  if (!signedIn) {
    return (
      <Link
        href="/login"
        className={buttonVariants({ size: "sm", className: "ml-2" })}
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="ml-2 flex items-center gap-2">
      <span className="text-muted-foreground hidden sm:inline text-xs">
        {isGuest ? "Guest" : email}
      </span>
      {isGuest ? (
        <Link
          href="/login"
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
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
