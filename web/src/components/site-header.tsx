import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthMenu } from "@/components/auth-menu";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = user?.is_anonymous ?? false;

  return (
    <header className="border-b sticky top-0 z-40 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Fit&nbsp;Finder
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/analyze"
            className="px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
          >
            Analyze
          </Link>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
          >
            Saved
          </Link>
          <AuthMenu email={user?.email ?? null} isGuest={isGuest} signedIn={!!user} />
        </nav>
      </div>
    </header>
  );
}
