import { cn } from "@/lib/utils";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";

/** Score ring + category progress bars — matches QualificationScoreOverview layout. */
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 sm:grid-cols-2 sm:items-center",
        className,
      )}
    >
      <div className="space-y-3 min-w-0">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <SkeletonPrimitive className="h-3.5 w-28" />
              <SkeletonPrimitive className="h-3.5 w-10" />
            </div>
            <SkeletonPrimitive className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <SkeletonPrimitive className="size-[120px] rounded-full" />
      </div>
    </div>
  );
}
