import { cn } from "@/lib/utils";

export function SkeletonPrimitive({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md", className)}
      aria-hidden
      {...props}
    />
  );
}
