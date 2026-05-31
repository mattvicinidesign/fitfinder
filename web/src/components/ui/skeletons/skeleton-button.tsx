import { cn } from "@/lib/utils";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";

export function SkeletonButton({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <SkeletonPrimitive
      className={cn(
        "w-full rounded-xl",
        size === "default" ? "h-12" : "h-9",
        className,
      )}
    />
  );
}
