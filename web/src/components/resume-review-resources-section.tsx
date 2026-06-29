"use client";

import { ExternalLink } from "lucide-react";
import {
  getResumeReviewResourcesForCategory,
  type ResumeReviewResource,
} from "@/lib/resume-review-resources";
import { openExternalUrl } from "@/lib/open-external-url";
import type { ResumeReviewCategoryKey } from "@/lib/types";
import { cn } from "@/lib/utils";

function ResourceBanner({ resource }: { resource: ResumeReviewResource }) {
  const Icon = resource.icon;

  return (
    <button
      type="button"
      onClick={() => void openExternalUrl(resource.url)}
      className={cn(
        "block w-[17.5rem] max-w-[calc(100%-3rem)] shrink-0 snap-start rounded-2xl p-5 text-left text-white shadow-sm outline-offset-2 transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-ring",
        resource.gradientClass,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-white/15">
          <Icon className="size-5" strokeWidth={2.1} aria-hidden />
        </div>
        <ExternalLink className="size-4 shrink-0 text-white/70" aria-hidden />
      </div>

      <h3 className="mt-4 text-[20px] font-bold leading-snug tracking-tight">
        {resource.title}
      </h3>
      <p className="mt-2 text-[14px] leading-snug text-white/85">
        {resource.description}
      </p>

      <span className="mt-4 inline-flex rounded-full bg-[#f4f0e8] px-4 py-2 text-[14px] font-semibold text-[#1e3a2f]">
        {resource.cta}
      </span>
    </button>
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
      aria-label="Relevant topics"
    >
      <h2 className="text-[15px] font-semibold text-foreground">
        Relevant Topics
      </h2>
      <div
        className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Resume improvement resources"
      >
        {resources.map((resource) => (
          <ResourceBanner key={resource.id} resource={resource} />
        ))}
      </div>
    </section>
  );
}
