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

      <div className="flex flex-col gap-[32px]">
        <div className="flex flex-col gap-2">
          <SkeletonPrimitive className="h-3 w-24" />
          <SkeletonPrimitive className="h-11 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-2">
          <SkeletonPrimitive className="h-3 w-20" />
          <SkeletonPrimitive className="h-11 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-2">
          <SkeletonPrimitive className="h-3 w-28" />
          <SkeletonPrimitive className="h-11 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-2">
          <SkeletonPrimitive className="h-3 w-24" />
          <SkeletonPrimitive className="min-h-[140px] w-full rounded-lg" />
        </div>
      </div>

      <SkeletonButton />
      <SkeletonText lines={2} width="lg" />
    </div>
  );
}
