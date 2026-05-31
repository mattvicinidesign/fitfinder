"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COPY = {
  save: {
    title: "Save this analysis",
    body: "Create a profile to save analyses and get recommendations tuned to you.",
    cta: "Create a Profile",
    href: "/signup",
  },
  history: {
    title: "View your analysis history",
    body: "Create a free account to keep a history of every job you analyze.",
    cta: "Create a Free Account",
    href: "/signup",
  },
} as const;

/**
 * Lightweight, non-blocking upgrade prompt shown only to guest (anonymous)
 * users. Renders nothing for registered users or while auth is resolving.
 */
export function GuestUpgradePrompt({
  variant = "save",
  className,
}: {
  variant?: keyof typeof COPY;
  className?: string;
}) {
  const [isGuest, setIsGuest] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsGuest(user ? (user.is_anonymous ?? false) : false);
    })();
  }, []);

  if (!isGuest) return null;
  const copy = COPY[variant];

  return (
    <div
      className={cn(
        "mx-4 rounded-xl border border-primary/30 bg-primary/10 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[15px] font-semibold leading-snug">{copy.title}</p>
          <p className="text-[13px] text-muted-foreground leading-snug">
            {copy.body}
          </p>
          <Link
            href={copy.href}
            className={buttonVariants({
              size: "sm",
              className: "mt-1 rounded-lg",
            })}
          >
            {copy.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
