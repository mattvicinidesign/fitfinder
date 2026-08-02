"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SkeletonOpportunityCarousel } from "@/components/ui/skeletons/skeleton-opportunity-card";
import type { RecommendedJob } from "@/lib/types";
import {
  clearRecommendedJobsCache,
  getCachedRecommendedJobs,
  loadRecommendedJobs,
} from "@/lib/load-recommended-jobs";
import { isNativePlatform } from "@/lib/platform";
import { openExternalUrl } from "@/lib/open-external-url";
import { screenGutterX } from "@/lib/screen-gutter";
import { createClient } from "@/lib/supabase/client";
import { useHorizontalScrollAxisLock } from "@/lib/use-horizontal-scroll-axis-lock";
import { cn } from "@/lib/utils";

const CAROUSEL_GAP_PX = 12;

const carouselNavButtonClass = cn(
  "pointer-events-auto absolute top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full",
  "border border-border/80 bg-card/95 text-foreground shadow-md backdrop-blur-sm",
  "transition-opacity hover:bg-card active:scale-95",
  "disabled:pointer-events-none disabled:opacity-0",
  "[appearance:none] [-webkit-appearance:none]",
);

const LOGO_SIZE_CLASS = "size-[75px] shrink-0";
const LOGO_FRAME_CLASS = cn(
  LOGO_SIZE_CLASS,
  "flex items-center justify-center overflow-hidden rounded-[4px] bg-white ring-1 ring-black/5",
);

function CompanyLogo({
  company,
  logoUrl,
}: {
  company: string;
  logoUrl: string | null;
}) {
  if (logoUrl) {
    return (
      <div className={LOGO_FRAME_CLASS}>
        <img
          src={logoUrl}
          alt=""
          width={75}
          height={75}
          className="size-full rounded-[4px] object-contain object-center p-1.5"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        LOGO_FRAME_CLASS,
        "bg-white text-[22px] font-semibold text-muted-foreground",
      )}
    >
      {company.charAt(0).toUpperCase()}
    </div>
  );
}

function RecommendedJobCard({ job }: { job: RecommendedJob }) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isNativePlatform()) return;
    event.preventDefault();
    void openExternalUrl(job.applyUrl);
  };

  return (
    <a
      href={job.applyUrl}
      onClick={handleClick}
      {...(!isNativePlatform() && {
        target: "_blank",
        rel: "noopener noreferrer",
      })}
      aria-label={`View ${job.title} at ${job.company}`}
      data-carousel-card
      className={cn(
        "block h-full shrink-0 snap-start rounded-xl outline-offset-2 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring",
        "min-w-[calc(50%-0.375rem)]",
      )}
    >
      <Card size="sm" className="h-full gap-3 py-3 ring-border/60">
        <div className="px-3">
          <CompanyLogo company={job.company} logoUrl={job.logoUrl} />
        </div>
        <CardHeader className="min-w-0 gap-1 px-3 pt-0 pb-3">
          <CardTitle className="truncate text-[15px] leading-snug">
            {job.title}
          </CardTitle>
          <CardDescription className="line-clamp-1 text-[13px]">
            {job.company}
          </CardDescription>
        </CardHeader>
      </Card>
    </a>
  );
}

function RecommendedJobsCarousel({
  jobs,
  embedded = false,
}: {
  jobs: RecommendedJob[];
  embedded?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useHorizontalScrollAxisLock(scrollRef);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    el.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    for (const child of el.children) {
      observer.observe(child);
    }

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [jobs, updateScrollState]);

  const scrollByCard = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-carousel-card]");
    if (!card) return;
    el.scrollBy({
      left: direction * (card.offsetWidth + CAROUSEL_GAP_PX),
      behavior: "smooth",
    });
  }, []);

  return (
    <div
      className={cn("relative min-w-0 overflow-hidden", !embedded && screenGutterX)}
    >
      <button
        type="button"
        aria-label="Previous jobs"
        className={cn(carouselNavButtonClass, "-left-1 sm:left-0")}
        disabled={!canScrollLeft}
        onClick={() => scrollByCard(-1)}
      >
        <ChevronLeft className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
      </button>

      <div
        ref={scrollRef}
        data-app-scroll-x
        className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Recommended jobs carousel"
      >
        {jobs.map((job) => (
          <RecommendedJobCard key={job.id} job={job} />
        ))}
      </div>

      <button
        type="button"
        aria-label="Next jobs"
        className={cn(carouselNavButtonClass, "-right-1 sm:right-0")}
        disabled={!canScrollRight}
        onClick={() => scrollByCard(1)}
      >
        <ChevronRight className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}

export function RecommendedJobsSection({ embedded = false }: { embedded?: boolean }) {
  const [jobs, setJobs] = useState<RecommendedJob[]>(getCachedRecommendedJobs);
  const [loading, setLoading] = useState(() => getCachedRecommendedJobs().length === 0);
  const [error, setError] = useState<string | null>(null);
  const [authEpoch, setAuthEpoch] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "USER_UPDATED"
      ) {
        return;
      }
      clearRecommendedJobsCache();
      setAuthEpoch((n) => n + 1);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;

    void loadRecommendedJobs()
      .then((next) => {
        if (!active) return;
        setJobs(next);
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setJobs([]);
        setError(
          e instanceof Error ? e.message : "Couldn't load recommended jobs.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authEpoch]);

  if (!loading && !error && jobs.length === 0) return null;

  return (
    <section className="space-y-2" aria-label="Recommended jobs">
      {loading ? (
        <SkeletonOpportunityCarousel count={3} />
      ) : error ? (
        <p className={cn("text-[14px] text-muted-foreground", !embedded && "px-4")}>
          {error}
        </p>
      ) : (
        <RecommendedJobsCarousel jobs={jobs} embedded={embedded} />
      )}
    </section>
  );
}
