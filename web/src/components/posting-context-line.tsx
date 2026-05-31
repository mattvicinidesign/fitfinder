"use client";

import { Badge } from "@/components/ui/badge";
import {
  hasPostingContextSignals,
  resolvePostingContext,
} from "@/lib/posting-context";
import type { ParsedJob, PostingContext } from "@/lib/types";
import {
  Briefcase,
  Building2,
  CircleHelp,
  Handshake,
  Network,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

function postingContextIcon(context: PostingContext): LucideIcon {
  const { employerType, hireTarget } = context;
  if (employerType === "agency" && hireTarget === "freelancer") return Handshake;
  if (employerType === "agency" && hireTarget === "agency") return Network;
  if (employerType === "agency") return Building2;
  if (employerType === "product_company" && hireTarget === "freelancer") {
    return Briefcase;
  }
  if (employerType === "product_company" && hireTarget === "direct_hire") {
    return UserRound;
  }
  if (employerType === "product_company") return Briefcase;
  if (hireTarget === "freelancer") return Handshake;
  if (hireTarget === "agency") return Network;
  if (hireTarget === "direct_hire") return UserRound;
  return CircleHelp;
}

export function PostingContextLine({
  postingContext,
  parsedJob,
  jobDescription,
  className,
}: {
  postingContext?: PostingContext | null;
  parsedJob?: ParsedJob;
  jobDescription?: string | null;
  className?: string;
}) {
  const context = parsedJob
    ? resolvePostingContext(parsedJob, postingContext, jobDescription)
    : postingContext;

  if (!context || !hasPostingContextSignals(context)) return null;

  const Icon = postingContextIcon(context);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0",
        className,
      )}
    >
      <Icon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <span className="text-[14px] text-muted-foreground leading-snug">
        {context.label}
      </span>
      {context.badges.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {context.badges.map((badge) => (
            <Badge
              key={badge}
              variant="outline"
              className="rounded-full border-primary/40 bg-primary/12 px-2 py-0 text-[10px] font-semibold text-primary"
            >
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
