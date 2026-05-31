import { SkeletonAvatar } from "@/components/ui/skeletons/skeleton-avatar";
import { SkeletonButton } from "@/components/ui/skeletons/skeleton-button";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";
import { SkeletonText } from "@/components/ui/skeletons/skeleton-text";

export function SkeletonProfileScreen() {
  return (
    <div className="space-y-7 px-4">
      <div className="flex items-center gap-4">
        <SkeletonAvatar size="lg" />
        <div className="flex-1 space-y-2">
          <SkeletonPrimitive className="h-5 w-36" />
          <SkeletonPrimitive className="h-3.5 w-28" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonPrimitive className="h-3 w-24" />
          <SkeletonPrimitive className="h-11 w-full rounded-lg" />
          <SkeletonPrimitive className="h-11 w-full rounded-lg" />
        </div>
        <div className="space-y-3">
          <SkeletonPrimitive className="h-3 w-20" />
          <SkeletonPrimitive className="h-11 w-full rounded-lg" />
          <SkeletonPrimitive className="h-11 w-full rounded-lg" />
        </div>
        <div className="space-y-3">
          <SkeletonPrimitive className="h-3 w-28" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonPrimitive key={index} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <SkeletonButton />
      <SkeletonText lines={2} width="lg" />
    </div>
  );
}
