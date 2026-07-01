import { RecentActivityZeroIllustration } from "@/components/recent-activity-zero-illustration";
import { cn } from "@/lib/utils";

export function RecentActivityZeroState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-4 py-8 text-center",
        className,
      )}
    >
      <div className="h-[9.5rem] w-[11rem]">
        <RecentActivityZeroIllustration />
      </div>
      <p className="mt-4 max-w-[18rem] text-[15px] leading-snug text-muted-foreground">
        No activity yet. Run a{" "}
        <span className="font-medium text-foreground">Fit Analysis</span> or{" "}
        <span className="font-medium text-foreground">Resume Score</span> to see
        results here.
      </p>
    </div>
  );
}
