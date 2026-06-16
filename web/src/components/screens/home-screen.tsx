"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  screenShellClass,
  StickyBottomCta,
} from "@/components/ui/sticky-bottom-cta";
import { createClient } from "@/lib/supabase/client";
import { IosGroupedSection } from "@/components/ui/ios-grouped-section";
import { IosAnalysisListRow } from "@/components/ui/ios-list-row";
import { RecommendedJobsSection } from "@/components/recommended-jobs-section";
import {
  SkeletonAnalysisList,
  SkeletonPrimitive,
} from "@/components/ui/skeletons";
import { cn } from "@/lib/utils";
import {
  activityMetaLine,
  loadRecentActivity,
  mergeRecentActivity,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { ReportLink } from "@/components/report-link";
import {
  ensureSampleAnalysisDataSeeded,
  pickRecentActivityList,
} from "@/lib/sample-analyses";
import { fetchUserDisplayName } from "@/lib/profile";
import { safeTopHomeHero } from "@/lib/safe-area";
import type { AnalysisRecord } from "@/lib/types";

const RECENT_LIMIT = 5;

export function HomeScreen() {
  const pathname = usePathname();
  const [analyses, setAnalyses] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [headerEntered, setHeaderEntered] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

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
    ensureSampleAnalysisDataSeeded();
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
    const merged = mergeRecentActivity(dbRows, localRows, RECENT_LIMIT);
    setAnalyses(pickRecentActivityList(merged, RECENT_LIMIT));
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function loadDisplayName() {
      const name = await fetchUserDisplayName();
      setDisplayName(name);
      setProfileLoading(false);
    }

    void loadDisplayName();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setDisplayName(null);
        return;
      }
      void loadDisplayName();
    });

    return () => subscription.unsubscribe();
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
    <div className={cn(screenShellClass, "bg-background")}>
      <div className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="relative z-0 overflow-hidden">
        <header
          className={cn(
            `rounded-b-[29px] bg-primary px-5 pb-32 text-primary-foreground ${safeTopHomeHero}`,
            !headerEntered && "home-header-pending",
            headerEntered && "home-header-enter",
          )}
        >
          {profileLoading ? (
            <SkeletonPrimitive className="h-3.5 w-36 bg-primary-foreground/20" />
          ) : (
            <p className="text-[13px] font-medium text-primary-foreground/80">
              {displayName ? `Welcome, ${displayName}` : "Welcome"}
            </p>
          )}
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
          className="flex items-center gap-3 rounded-2xl bg-card px-4 py-4 shadow-lg ring-1 ring-border"
        >
          <Image
            src="/only-fit-wordmark.png"
            alt="OnlyFit"
            width={331}
            height={148}
            className="h-6 w-auto shrink-0 object-contain"
          />
          <span className="flex-1 text-[16px] font-medium text-muted-foreground">
            Search Reports
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
        </div>

        <div className="py-6 space-y-6">
          <RecommendedJobsSection />

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
              <SkeletonAnalysisList count={5} />
            ) : analyses.length === 0 ? (
              <p className="px-4 py-10 text-center text-[15px] text-muted-foreground leading-snug">
                No activity yet. Tap{" "}
                <span className="font-medium text-foreground">Analyze Fit</span>{" "}
                to run your first fit report.
              </p>
            ) : (
              <IosGroupedSection>
                {analyses.map((a) => (
                  <ReportLink
                    key={a.id}
                    analysis={a}
                    from="/home"
                    className="block transition-colors hover:bg-muted/30 active:bg-muted/40"
                  >
                    <IosAnalysisListRow
                      analysis={a}
                      subtitle={activityMetaLine(a)}
                    />
                  </ReportLink>
                ))}
              </IosGroupedSection>
            )}
          </section>
        </div>
      </div>
      </div>

      <StickyBottomCta>
        <Link
          href="/analyze"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "h-12 w-full rounded-xl text-[17px] font-semibold",
          )}
        >
          Analyze Fit
        </Link>
      </StickyBottomCta>
    </div>
  );
}
