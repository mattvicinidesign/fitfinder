import { SkeletonButton } from "@/components/ui/skeletons/skeleton-button";
import { SkeletonPrimitive } from "@/components/ui/skeletons/skeleton-primitive";
import { SkeletonText } from "@/components/ui/skeletons/skeleton-text";

/** App shell placeholder while auth state resolves. */
export function SkeletonAppShell({ showTabBar = true }: { showTabBar?: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <main className="min-h-0 flex-1 overflow-hidden px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <SkeletonPrimitive className="h-9 w-40" />
        <SkeletonText className="mt-2" width="md" lineClassName="h-3" />
        <div className="mt-8 space-y-4">
          <SkeletonPrimitive className="h-28 w-full rounded-2xl" />
          <SkeletonText lines={3} />
          <SkeletonButton />
        </div>
      </main>
      {showTabBar ? (
        <div className="shrink-0 border-t border-border/60 bg-background/95 px-2 pb-[max(0px,env(safe-area-inset-bottom))] pt-2">
          <div className="flex items-end justify-between gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-1 py-1">
                <SkeletonPrimitive className="size-6 rounded-md" />
                <SkeletonPrimitive className="h-2 w-8" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
