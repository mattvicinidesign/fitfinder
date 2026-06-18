"use client";

import { ExternalLink } from "lucide-react";
import { getResumeReviewCategoryIcon } from "@/lib/resume-review-categories";
import {
  getResumeReviewResourcesForCategory,
} from "@/lib/resume-review-resources";
import { isNativePlatform } from "@/lib/platform";
import { openExternalUrl } from "@/lib/open-external-url";
import type { ResumeReviewCategoryKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { MouseEvent } from "react";

function ResourceBanner({
  title,
  description,
  url,
  cta,
  categoryKey,
}: {
  title: string;
  description: string;
  url: string;
  cta: string;
  categoryKey: ResumeReviewCategoryKey;
}) {
  const Icon = getResumeReviewCategoryIcon(categoryKey);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isNativePlatform()) return;
    event.preventDefault();
    void openExternalUrl(url);
  };

  return (
    <a
      href={url}
      onClick={handleClick}
      {...(!isNativePlatform() && {
        target: "_blank",
        rel: "noopener noreferrer",
      })}
      className="block min-w-[min(100%,18.5rem)] shrink-0 snap-start rounded-2xl bg-gradient-to-br from-primary to-[#023e8a] p-5 text-white shadow-sm outline-offset-2 transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-white/15">
          <Icon className="size-5" strokeWidth={2.1} aria-hidden />
        </div>
        <ExternalLink className="size-4 shrink-0 text-white/70" aria-hidden />
      </div>

      <h3 className="mt-4 text-[20px] font-bold leading-snug tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-[14px] leading-snug text-white/85">{description}</p>

      <span className="mt-4 inline-flex rounded-full bg-[#f4f0e8] px-4 py-2 text-[14px] font-semibold text-[#1e3a2f]">
        {cta}
      </span>
    </a>
  );
}

export function ResumeReviewResourcesSection({
  categoryKey,
  className,
}: {
  categoryKey: ResumeReviewCategoryKey;
  className?: string;
}) {
  const resources = getResumeReviewResourcesForCategory(categoryKey);
  if (resources.length === 0) return null;

  return (
    <section
      className={cn("space-y-2", className)}
      aria-label="Resume resources"
    >
      <h2 className="text-[13px] font-normal uppercase tracking-wide text-muted-foreground">
        Resources
      </h2>
      <div
        className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Resume improvement resources"
      >
        {resources.map((resource) => (
          <ResourceBanner
            key={resource.id}
            title={resource.title}
            description={resource.description}
            url={resource.url}
            cta={resource.cta}
            categoryKey={resource.categoryKey}
          />
        ))}
      </div>
    </section>
  );
}
