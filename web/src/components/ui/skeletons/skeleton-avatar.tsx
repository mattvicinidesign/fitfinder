import { cn } from "@/lib/utils";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";

export function SkeletonAvatar({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "size-9" : size === "lg" ? "size-16" : "size-12";

  return (
    <SkeletonPrimitive className={cn("shrink-0 rounded-full", sizeClass, className)} />
  );
}
