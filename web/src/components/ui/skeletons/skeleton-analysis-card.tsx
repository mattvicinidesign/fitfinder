import { cn } from "@/lib/utils";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";

/** Matches IosAnalysisListRow — title, subtitle, score, badge area. */
export function SkeletonAnalysisCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-background px-4 py-3.5",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonPrimitive className="h-[17px] w-[72%] max-w-[220px]" />
        <SkeletonPrimitive className="h-3.5 w-[48%] max-w-[160px]" />
        <SkeletonPrimitive className="h-3 w-20 rounded-full" />
      </div>
      <div className="shrink-0 space-y-1.5 text-right">
        <SkeletonPrimitive className="ml-auto h-7 w-10" />
        <SkeletonPrimitive className="ml-auto h-2.5 w-6" />
      </div>
    </div>
  );
}

export function SkeletonAnalysisList({
  count = 5,
  className,
  rowClassName,
}: {
  count?: number;
  className?: string;
  rowClassName?: string;
}) {
  return (
    <div
      className={cn(
        "mx-4 overflow-hidden rounded-xl bg-muted/40 divide-y divide-border/80",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonAnalysisCard key={index} className={rowClassName} />
      ))}
    </div>
  );
}
