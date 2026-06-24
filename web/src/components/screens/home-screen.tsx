"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HomeSearchReportsBar } from "@/components/home-search-reports-bar";
import {
  filterSearchReportItems,
  SearchReportsDropdown,
} from "@/components/search-reports-dropdown";
import { usePathname } from "next/navigation";
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
import { MetricScore } from "@/components/ui/metric-score";
import {
  SkeletonAnalysisList,
  SkeletonHomeWelcome,
  SkeletonPrimitive,
} from "@/components/ui/skeletons";
import {
  markHomeHeaderEnterDone,
  shouldPlayHomeHeaderEnter,
} from "@/lib/app-session";
import { useAppShellVisible } from "@/lib/app-shell-visible";
import {
  buildHomeActivitySnapshot,
  readHomeActivitySnapshot,
  writeHomeActivitySnapshot,
} from "@/lib/home-activity";
import { computeHomeFitStats, type HomeFitStats } from "@/lib/analysis-stats";
import { cn } from "@/lib/utils";
import {
  activityMetaLine,
  type RecentActivityItem,
} from "@/lib/recent-activity";
import { ReportLink } from "@/components/report-link";
import { homeHeroContentInset, screenGutterX } from "@/lib/screen-gutter";
import type { AnalysisRecord } from "@/lib/types";

const RECENT_LIMIT = 20;

type HomeHeaderPlayState = "pending" | "animating" | "entered";

function initialHeaderPlayState(): HomeHeaderPlayState {
  if (typeof window === "undefined") return "pending";
  return shouldPlayHomeHeaderEnter() ? "pending" : "entered";
}

function initialHomeActivity() {
  if (typeof window === "undefined") {
    return { analyses: [] as RecentActivityItem[], fitStats: null as HomeFitStats | null };
  }
  const snapshot = readHomeActivitySnapshot(RECENT_LIMIT);
  return { analyses: snapshot.analyses, fitStats: snapshot.fitStats };
}

function HomeHeroStats({ stats }: { stats: HomeFitStats }) {
  return (
    <div className="min-w-0 flex-1 pb-1">
      <div className="flex items-center gap-1.5">
        <p className="text-[13px] font-bold uppercase tracking-[0.05em]">
          Avg Fit Score
        </p>
        <InfoTooltip
          label="About your average fit score"
          triggerClassName="size-5 text-primary-foreground/65 hover:text-primary-foreground focus-visible:ring-primary-foreground/40 [&_svg]:size-4"
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
      <MetricScore
        as="p"
        size="hero"
        className="mt-1 font-bold text-primary-foreground"
      >
        {stats.averageFitOnTen?.toFixed(1) ?? "—"}
      </MetricScore>
      <p className="mt-2.5 text-[12px] font-semibold leading-snug text-primary-foreground">
        <span className="tabular-nums text-emerald-400">
          {stats.onlyFitPercent}%
        </span>{" "}
        <span className="text-emerald-400">OnlyFits</span>
        {stats.lastAnalysisDateLabel ? (
          <>
            {" "}
            <span className="text-primary-foreground/90">
              • Updated {stats.lastAnalysisDateLabel}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}

export function HomeScreen() {
  const pathname = usePathname();
  const appShellVisible = useAppShellVisible();
  const initialActivity = initialHomeActivity();
  const [analyses, setAnalyses] = useState<RecentActivityItem[]>(
    initialActivity.analyses,
  );
  const [fitStats, setFitStats] = useState<HomeFitStats | null>(
    initialActivity.fitStats,
  );
  const [loading, setLoading] = useState(initialActivity.analyses.length === 0);
  const [headerPlayState, setHeaderPlayState] =
    useState<HomeHeaderPlayState>(initialHeaderPlayState);
  const searchSentinelRef = useRef<HTMLDivElement>(null);
  const [searchStuck, setSearchStuck] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const searchDropdownItems = useMemo(
    () => filterSearchReportItems(analyses, searchQuery),
    [analyses, searchQuery],
  );

  const closeSearch = useCallback(() => {
    setSearchQuery("");
    setSearchActive(false);
    setSearchFocused(false);
  }, []);

  useLayoutEffect(() => {
    if (pathname !== "/home" || !appShellVisible) return;

    if (!shouldPlayHomeHeaderEnter()) {
      setHeaderPlayState("entered");
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      markHomeHeaderEnterDone();
      setHeaderPlayState("entered");
      return;
    }

    setHeaderPlayState("pending");
    let outerFrame = 0;
    let innerFrame = 0;
    outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        setHeaderPlayState("animating");
      });
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [pathname, appShellVisible]);

  const homeContentReady = headerPlayState === "entered";

  const handleHeaderAnimationEnd = useCallback(
    (event: React.AnimationEvent<HTMLDivElement>) => {
      if (event.animationName !== "home-header-enter") return;
      markHomeHeaderEnterDone();
      setHeaderPlayState("entered");
    },
    [],
  );

  const loadActivity = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("analyses")
      .select(
        "id, company_name, job_title, job_description, parsed_job_json, fit_score, qualification_score, confidence_score, recommendation, recommendation_label, created_at",
      )
      .order("created_at", { ascending: false });

    const dbRows = (data ?? []) as AnalysisRecord[];
    const snapshot = buildHomeActivitySnapshot(dbRows, RECENT_LIMIT);
    writeHomeActivitySnapshot(snapshot);
    setFitStats(snapshot.fitStats);
    setAnalyses(snapshot.analyses);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!homeContentReady) return;
    void loadActivity();
  }, [loadActivity, homeContentReady]);

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
    !loading && fitStats != null && fitStats.analyzedCount > 0;

  useLayoutEffect(() => {
    if (!homeContentReady) return;

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
  }, [pathname, homeContentReady, showPersonalizedHero, loading]);

  return (
    <div className={cn(screenShellClass, "bg-background")}>
      <div
        className="relative z-0 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y pb-[4.5rem]"
        data-app-scroll-y
      >
        <div
          className={cn(
            "relative z-0",
            headerPlayState === "pending" && "home-header-pending",
            headerPlayState === "animating" && "home-header-enter",
            headerPlayState === "entered" && "home-header-entered",
          )}
          onAnimationEnd={handleHeaderAnimationEnd}
        >
          <div className="overflow-hidden rounded-b-[29px]">
            <header
              className={cn(
                "home-hero-gradient text-primary-foreground",
                homeHeroContentInset,
                showPersonalizedHero ? "pb-10" : "pb-24",
              )}
            >
              {loading ? (
                <div className="flex items-end justify-between gap-3">
                  <SkeletonHomeWelcome className="flex-1" />
                  <SkeletonPrimitive className="h-[140px] w-[148px] shrink-0 rounded-xl bg-primary-foreground/15" />
                </div>
              ) : showPersonalizedHero ? (
                <div className="flex items-center justify-between gap-2">
                  <HomeHeroStats stats={fitStats} />
                  <div className="h-[140px] w-[148px] shrink-0">
                    <HomeHeroIllustration />
                  </div>
                </div>
              ) : (
                <h1 className="max-w-[17rem] text-[28px] font-bold leading-tight tracking-tight">
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
            "sticky top-0 z-30",
            screenGutterX,
            searchStuck
              ? "pb-3 pt-[max(1rem,env(safe-area-inset-top))]"
              : "pb-5",
          )}
        >
          <div className={cn(!searchStuck && "-mt-7")}>
            <HomeSearchReportsBar
              value={searchQuery}
              onChange={setSearchQuery}
              active={searchActive}
              onActiveChange={setSearchActive}
              onFocusChange={setSearchFocused}
              typewriterEnabled={homeContentReady}
            >
              {searchActive && searchFocused ? (
                <SearchReportsDropdown
                  items={searchDropdownItems}
                  query={searchQuery}
                  loading={loading}
                  onSelect={closeSearch}
                />
              ) : null}
            </HomeSearchReportsBar>
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
              screenGutterX,
              searchStuck ? "pt-3" : "pt-6",
              !homeContentReady && "opacity-0",
            )}
          >
            {homeContentReady ? (
              <>
            <RecommendedJobsSection embedded />

            <section className="space-y-2">
              <h2 className="text-[13px] font-normal uppercase tracking-wide text-muted-foreground">
                Recent activity
              </h2>

              {loading ? (
                <SkeletonAnalysisList
                  count={RECENT_LIMIT}
                  className="mx-0"
                  rowClassName="px-0"
                />
              ) : analyses.length === 0 ? (
                <p className="py-10 text-center text-[15px] text-muted-foreground leading-snug">
                  No activity yet. Tap{" "}
                  <span className="font-medium text-foreground">Analyze Fit</span>{" "}
                  to run your first fit report.
                </p>
              ) : (
                <IosGroupedSection fullWidth>
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
                        className="px-0"
                      />
                    </ReportLink>
                  ))}
                </IosGroupedSection>
              )}
            </section>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <StickyBottomCta variant="floating" scrollFade>
        <Link
          href="/analyze"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "h-12 w-full rounded-xl text-[17px] font-semibold shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
          )}
        >
          Analyze Fit
        </Link>
      </StickyBottomCta>
    </div>
  );
}
