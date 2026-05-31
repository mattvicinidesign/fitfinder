import { cn } from "@/lib/utils";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";

/** Saved job row — same dimensions as analysis list rows. */
export function SkeletonJobCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card px-4 py-4 ring-1 ring-border/60",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <SkeletonPrimitive className="h-4 w-[80%]" />
          <SkeletonPrimitive className="h-3.5 w-[55%]" />
          <SkeletonPrimitive className="h-5 w-24 rounded-full" />
        </div>
        <SkeletonPrimitive className="h-8 w-11 shrink-0" />
      </div>
    </div>
  );
}

export function SkeletonJobList({
  count = 5,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3 px-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonJobCard key={index} />
      ))}
    </div>
  );
}
