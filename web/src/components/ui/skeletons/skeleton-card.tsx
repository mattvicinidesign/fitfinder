import { cn } from "@/lib/utils";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";

export function SkeletonCard({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-muted/20 ring-1 ring-border/50",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SkeletonCardBlock({
  className,
  height = "h-20",
}: {
  className?: string;
  height?: string;
}) {
  return <SkeletonPrimitive className={cn("w-full rounded-none", height, className)} />;
}
