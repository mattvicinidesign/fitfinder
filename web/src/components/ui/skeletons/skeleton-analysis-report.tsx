import { SkeletonCard } from "@/components/ui/skeletons/skeleton-card";
import { SkeletonChart } from "@/components/ui/skeletons/skeleton-chart";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";
import { SkeletonText } from "@/components/ui/skeletons/skeleton-text";

/** Full analysis report placeholder — score, categories, summary blocks. */
export function SkeletonAnalysisReport() {
  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-4">
        <SkeletonText width="sm" lineClassName="h-2.5" />
        <SkeletonPrimitive className="h-6 w-[78%] max-w-[280px]" />
        <SkeletonPrimitive className="h-3.5 w-[45%]" />
        <div className="flex flex-wrap gap-2 pt-1">
          <SkeletonPrimitive className="h-6 w-20 rounded-full" />
          <SkeletonPrimitive className="h-6 w-24 rounded-full" />
          <SkeletonPrimitive className="h-6 w-16 rounded-full" />
        </div>
      </div>

      <SkeletonCard className="p-4 space-y-4">
        <SkeletonPrimitive className="h-3 w-28" />
        <SkeletonChart />
      </SkeletonCard>

      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonCard key={index} className="p-4 space-y-3">
          <SkeletonPrimitive className="h-4 w-36" />
          <SkeletonText lines={2} />
          <SkeletonPrimitive className="h-1.5 w-full rounded-full" />
        </SkeletonCard>
      ))}

      <SkeletonCard className="p-4 space-y-3">
        <SkeletonPrimitive className="h-4 w-44" />
        <SkeletonText lines={3} />
      </SkeletonCard>
    </div>
  );
}
