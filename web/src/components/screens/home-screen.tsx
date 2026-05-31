"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ScanSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { IosGroupedSection } from "@/components/ui/ios-grouped-section";
import { IosAnalysisListRow } from "@/components/ui/ios-list-row";
import { GuestUpgradePrompt } from "@/components/guest-upgrade-prompt";
import { cn } from "@/lib/utils";
import {
  activityMetaLine,
  loadRecentActivity,
  mergeRecentActivity,
  reportHrefForAnalysis,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import type { AnalysisRecord } from "@/lib/types";

const RECENT_LIMIT = 5;

export function HomeScreen() {
  const pathname = usePathname();
  const [analyses, setAnalyses] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerEntered, setHeaderEntered] = useState(false);

  useEffect(() => {
    if (pathname !== "/home") {
      setHeaderEntered(false);
      return;
    }

    setHeaderEntered(false);
    const frame = requestAnimationFrame(() => setHeaderEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const loadActivity = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("analyses")
      .select(
        "id, company_name, job_title, job_description, parsed_job_json, fit_score, qualification_score, confidence_score, recommendation, recommendation_label, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT * 2);

    const dbRows = (data ?? []) as AnalysisRecord[];
    const localRows = loadRecentActivity();
    setAnalyses(mergeRecentActivity(dbRows, localRows, RECENT_LIMIT));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    const refresh = () => void loadActivity();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadActivity]);

  return (
    <div className="min-h-full bg-background">
      <div className="relative z-0 overflow-hidden">
        <header
          className={cn(
            "rounded-b-[29px] bg-primary px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-32 text-primary-foreground",
            !headerEntered && "home-header-pending",
            headerEntered && "home-header-enter",
          )}
        >
          <p className="text-[13px] font-medium text-primary-foreground/80">
            Welcome back
          </p>
          <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight">
            Know if you fit, before you apply.
          </h1>
        </header>
      </div>

      <div className="relative z-10">
        {/* Search-style CTA straddling the header / body boundary */}
        <div className="px-4 -mt-7">
        <Link
          href="/analyze"
          className="flex items-center gap-3 rounded-2xl bg-card px-4 py-4 shadow-lg ring-1 ring-border transition-colors hover:bg-muted/40"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ScanSearch className="size-5" aria-hidden />
          </span>
          <span className="flex-1 text-[16px] font-medium text-muted-foreground">
            Paste a job to analyze…
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
        </div>

        <div className="py-6 space-y-6">
          <GuestUpgradePrompt variant="save" />

          <section className="space-y-2">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-[13px] font-normal uppercase tracking-wide text-muted-foreground">
                Recent activity
              </h2>
              {analyses.length > 0 ? (
                <Link
                  href="/saved"
                  className="text-[13px] font-medium text-primary hover:underline"
                >
                  View saved
                </Link>
              ) : null}
            </div>

            {loading ? (
              <p className="px-4 text-[15px] text-muted-foreground">Loading…</p>
            ) : analyses.length === 0 ? (
              <p className="px-4 py-10 text-center text-[15px] text-muted-foreground leading-snug">
                No activity yet. Tap{" "}
                <span className="font-medium text-foreground">Analyze a Job</span>{" "}
                to run your first fit report.
              </p>
            ) : (
              <IosGroupedSection>
                {analyses.map((a) => (
                  <Link
                    key={a.id}
                    href={reportHrefForAnalysis(a)}
                    className="block transition-colors hover:bg-muted/30 active:bg-muted/40"
                  >
                    <IosAnalysisListRow
                      analysis={a}
                      subtitle={activityMetaLine(a)}
                    />
                  </Link>
                ))}
              </IosGroupedSection>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
