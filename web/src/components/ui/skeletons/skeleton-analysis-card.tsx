import { cn } from "@/lib/utils";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";

/** Matches IosAnalysisListRow — title, subtitle, pill, score. */
export function SkeletonAnalysisCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto_minmax(4.5rem,auto)] items-center gap-x-2 bg-background px-4 py-3.5",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <SkeletonPrimitive className="h-[17px] w-full max-w-[220px]" />
        <SkeletonPrimitive className="h-3.5 w-[70%] max-w-[160px]" />
      </div>
      <div className="flex justify-center">
        <SkeletonPrimitive className="h-6 w-[5.5rem] rounded-full" />
      </div>
      <SkeletonPrimitive className="ml-auto h-7 w-12" />
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
