import { cn } from "@/lib/utils";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";

/** Opportunity carousel card — title, company, compensation, location. */
export function SkeletonOpportunityCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[260px] shrink-0 rounded-xl bg-card p-4 ring-1 ring-border/60",
        className,
      )}
    >
      <SkeletonPrimitive className="h-4 w-[85%]" />
      <SkeletonPrimitive className="mt-2.5 h-3.5 w-[60%]" />
      <div className="mt-4 flex items-center justify-between gap-2">
        <SkeletonPrimitive className="h-3.5 w-20" />
        <SkeletonPrimitive className="h-3.5 w-16" />
      </div>
      <SkeletonPrimitive className="mt-2 h-3 w-24" />
    </div>
  );
}

export function SkeletonOpportunityCarousel({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-3 overflow-hidden px-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonOpportunityCard key={index} />
      ))}
    </div>
  );
}
