import { cn } from "@/lib/utils";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";

type SkeletonTextWidth = "xs" | "sm" | "md" | "lg" | "full";

const WIDTH: Record<SkeletonTextWidth, string> = {
  xs: "w-16",
  sm: "w-24",
  md: "w-40",
  lg: "w-56",
  full: "w-full",
};

export function SkeletonText({
  lines = 1,
  width = "full",
  className,
  lineClassName,
}: {
  lines?: number;
  width?: SkeletonTextWidth;
  className?: string;
  lineClassName?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonPrimitive
          key={index}
          className={cn(
            "h-3.5",
            index === lines - 1 && lines > 1 ? "w-4/5" : WIDTH[width],
            lineClassName,
          )}
        />
      ))}
    </div>
  );
}
