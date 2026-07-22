"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { requestSignupFlow } from "@/lib/app-session";
import {
  QA_ACCOUNT_MODE_CHANGED_EVENT,
  resolveIsGuestUser,
} from "@/lib/qa-account-mode";
import { buttonVariants } from "@/components/ui/button";
import { SCREEN_REGULAR_CTA_CLASS } from "@/components/resume-upload-styles";
import { cn } from "@/lib/utils";

const COPY = {
  save: {
    title: "Save this analysis",
    body: "Create a profile to save analyses and get recommendations tuned to you.",
    cta: "Create a Profile",
    href: "/home?signup=1",
  },
  categoryWeighting: {
    title: "Unlock custom presets",
    body: "Create a profile to adjust category weighting and save your own Fit Score presets.",
    cta: "Create a Profile",
    href: "/home?signup=1",
  },
} as const;

/**
 * Lightweight, non-blocking upgrade prompt shown only to guest (anonymous)
 * users. Renders nothing for registered users or while auth is resolving.
 */
export function GuestUpgradePrompt({
  variant = "save",
  className,
  /** When parent already knows the user is a guest, skip the auth probe. */
  forceGuest = false,
}: {
  variant?: keyof typeof COPY;
  className?: string;
  forceGuest?: boolean;
}) {
  const [isGuest, setIsGuest] = useState<boolean | null>(
    forceGuest ? true : null,
  );

  useEffect(() => {
    if (forceGuest) return;

    function applyGuest(user: { is_anonymous?: boolean | null } | null) {
      setIsGuest(resolveIsGuestUser(user));
    }

    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      applyGuest(user);
    })();

    function onQaModeChange() {
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        applyGuest(user);
      })();
    }

    window.addEventListener(QA_ACCOUNT_MODE_CHANGED_EVENT, onQaModeChange);
    return () => {
      window.removeEventListener(QA_ACCOUNT_MODE_CHANGED_EVENT, onQaModeChange);
    };
  }, [forceGuest]);

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
            onClick={() =>
              requestSignupFlow(
                variant === "categoryWeighting"
                  ? { returnTo: "/profile?tab=preferences" }
                  : undefined,
              )
            }
            className={cn(buttonVariants({ className: SCREEN_REGULAR_CTA_CLASS }), "mt-1")}
          >
            {copy.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
