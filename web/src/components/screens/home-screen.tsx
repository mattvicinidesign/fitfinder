"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { HomeHeroIllustration } from "@/components/home-hero-illustration";
import { InfoTooltip } from "@/components/info-tooltip";
import {
  SkeletonAnalysisList,
  SkeletonHomeWelcome,
  SkeletonPrimitive,
} from "@/components/ui/skeletons";
import { computeHomeFitStats, type HomeFitStats } from "@/lib/analysis-stats";
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
  getSampleAnalyses,
  pickAnalysisListWithSamples,
  pickRecentActivityList,
} from "@/lib/sample-analyses";
import { fetchUserDisplayName } from "@/lib/profile";
import { homeHeroContentInset } from "@/lib/screen-gutter";
import type { AnalysisRecord } from "@/lib/types";

const RECENT_LIMIT = 15;

function HomeHeroStats({ stats }: { stats: HomeFitStats }) {
  return (
    <div className="min-w-0 flex-1 pb-1">
      <div className="flex items-start gap-1.5">
        <p className="text-[64px] font-bold tabular-nums leading-none tracking-tight">
          {stats.averageFitOnTen?.toFixed(1) ?? "—"}
        </p>
        <InfoTooltip
          label="About your average fit score"
          triggerClassName="mt-4 size-6 text-primary-foreground/65 hover:text-primary-foreground focus-visible:ring-primary-foreground/40 [&_svg]:size-4"
          panelClassName="z-30 w-64"
          text={
            <>
              <span className="block">
                Your average fit score is the mean of fit scores across every job
                you&apos;ve analyzed, shown on a 0–10 scale.
              </span>
              <span className="mt-2 block">
                An <strong>OnlyFit</strong> is any analysis with a fit score of
                9.0 or above—the strongest matches in your history.
              </span>
            </>
          }
        />
      </div>
      <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.12em]">
        Avg Fit Score
      </p>
      <p className="mt-2.5 text-[12px] font-semibold leading-snug text-primary-foreground">
        <span className="tabular-nums text-emerald-400">
          {stats.onlyFitPercent}%
        </span>{" "}
        <span className="text-emerald-400">OnlyFits</span>
        {stats.lastAnalysisDateLabel ? (
          <>
            {" "}
            <span className="text-primary-foreground/90">
              • Last Analysis {stats.lastAnalysisDateLabel}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}

export function HomeScreen() {
  const pathname = usePathname();
  const [analyses, setAnalyses] = useState<RecentActivityItem[]>([]);
  const [fitStats, setFitStats] = useState<HomeFitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [headerEntered, setHeaderEntered] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const searchSentinelRef = useRef<HTMLDivElement>(null);
  const [searchStuck, setSearchStuck] = useState(false);

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
      .order("created_at", { ascending: false });

    const dbRows = (data ?? []) as AnalysisRecord[];
    const localRows = loadRecentActivity();
    const merged = mergeRecentActivity(
      dbRows,
      localRows,
      Number.MAX_SAFE_INTEGER,
    );
    const statsSource = pickAnalysisListWithSamples(merged, getSampleAnalyses());
    setFitStats(computeHomeFitStats(statsSource));
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

  const showPersonalizedHero =
    !loading && !profileLoading && fitStats != null && fitStats.analyzedCount > 0;

  useEffect(() => {
    const sentinel = searchSentinelRef.current;
    if (!sentinel) return;

    const scrollRoot = sentinel.closest("[data-app-scroll-y]");
    if (!scrollRoot) return;

    const updateStuck = () => {
      const rootTop = scrollRoot.getBoundingClientRect().top;
      const sentinelTop = sentinel.getBoundingClientRect().top;
      setSearchStuck(sentinelTop <= rootTop + 1);
    };

    scrollRoot.addEventListener("scroll", updateStuck, { passive: true });
    window.addEventListener("resize", updateStuck);
    updateStuck();

    return () => {
      scrollRoot.removeEventListener("scroll", updateStuck);
      window.removeEventListener("resize", updateStuck);
    };
  }, [pathname, headerEntered, showPersonalizedHero, loading, profileLoading]);

  return (
    <div className={cn(screenShellClass, "bg-background")}>
      <div
        className="relative z-0 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y"
        data-app-scroll-y
      >
        <div
          className={cn(
            "relative z-0",
            !headerEntered && "home-header-pending",
            headerEntered && "home-header-enter",
          )}
        >
          <div className="overflow-hidden rounded-b-[29px]">
            <header
              className={cn(
                `bg-primary pr-4 text-primary-foreground ${homeHeroContentInset}`,
                showPersonalizedHero ? "pb-10" : "pb-24",
              )}
            >
              {profileLoading ? (
                <SkeletonPrimitive className="h-4 w-36 bg-primary-foreground/20" />
              ) : (
                <p className="text-[15px] font-medium">
                  {displayName ? `Welcome, ${displayName}` : "Welcome"}
                </p>
              )}

              {loading || profileLoading ? (
                <div className="mt-4 flex items-end justify-between gap-3">
                  <SkeletonHomeWelcome className="flex-1" />
                  <SkeletonPrimitive className="h-[140px] w-[148px] shrink-0 rounded-xl bg-primary-foreground/15" />
                </div>
              ) : showPersonalizedHero ? (
                <div className="mt-4 flex items-center justify-between gap-2">
                  <HomeHeroStats stats={fitStats} />
                  <div className="h-[140px] w-[148px] shrink-0">
                    <HomeHeroIllustration />
                  </div>
                </div>
              ) : (
                <h1 className="mt-2 max-w-[17rem] text-[28px] font-bold leading-tight tracking-tight">
                  Know if you fit, before you apply.
                </h1>
              )}
            </header>
          </div>
          <div
            ref={searchSentinelRef}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
            aria-hidden
          />
        </div>

        <div
          className={cn(
            "sticky top-0 z-30 px-4",
            searchStuck
              ? "bg-background pb-3 pt-[max(1rem,env(safe-area-inset-top))]"
              : "pb-5",
          )}
        >
          <div className={cn(!searchStuck && "-mt-7")}>
            <div className="relative flex items-center gap-3 rounded-2xl bg-[#0f1419] px-4 py-4 shadow-lg ring-1 ring-white/10">
              <Image
                src="/only-fit-wordmark.png"
                alt=""
                width={331}
                height={148}
                className="h-6 w-auto shrink-0 object-contain"
                aria-hidden
              />
              <span className="flex-1 text-[16px] font-medium text-white/70">
                Search Reports
              </span>
              <ChevronRight className="size-5 shrink-0 text-white/70" aria-hidden />
            </div>
          </div>
        </div>

        <div
          className={cn(
            "relative z-0 bg-background",
            !searchStuck && "-mt-7",
          )}
        >
          <div
            className={cn(
              "space-y-6 pb-6",
              searchStuck ? "pt-3" : "pt-6",
            )}
          >
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
                <SkeletonAnalysisList count={RECENT_LIMIT} />
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
