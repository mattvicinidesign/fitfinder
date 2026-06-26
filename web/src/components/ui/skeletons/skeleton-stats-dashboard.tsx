import { cn } from "@/lib/utils";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";

export function SkeletonStatsDashboard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-5 px-4 pb-6", className)}>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonPrimitive key={index} className="h-[5.5rem] rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonPrimitive className="h-52 rounded-xl" />
        <SkeletonPrimitive className="h-52 rounded-xl" />
      </div>
      <SkeletonPrimitive className="h-64 rounded-xl" />
    </div>
  );
}
