import { SkeletonAnalysisList } from "@/components/ui/skeletons/skeleton-analysis-card";
import { SkeletonOpportunityCarousel } from "@/components/ui/skeletons/skeleton-opportunity-card";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";

export function SkeletonHomeWelcome({ className }: { className?: string }) {
  return (
    <div className={className}>
      <SkeletonPrimitive className="h-3 w-28 bg-primary-foreground/20" />
      <SkeletonPrimitive className="mt-2 h-14 w-20 bg-primary-foreground/20" />
      <SkeletonPrimitive className="mt-3 h-4 w-36 bg-primary-foreground/20" />
    </div>
  );
}

export function SkeletonHomeCta() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-4 ring-1 ring-border">
      <SkeletonPrimitive className="size-9 shrink-0 rounded-full" />
      <SkeletonPrimitive className="h-4 flex-1" />
      <SkeletonPrimitive className="size-5 shrink-0 rounded-md" />
    </div>
  );
}

export function SkeletonHomeRecentSection({
  showOpportunities = false,
}: {
  showOpportunities?: boolean;
}) {
  return (
    <div className="space-y-6">
      {showOpportunities ? (
        <section className="space-y-3">
          <SkeletonPrimitive className="mx-4 h-3 w-40" />
          <SkeletonOpportunityCarousel count={3} />
        </section>
      ) : null}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-4">
          <SkeletonPrimitive className="h-3 w-28" />
          <SkeletonPrimitive className="h-3 w-16" />
        </div>
        <SkeletonAnalysisList count={5} />
      </section>
    </div>
  );
}
