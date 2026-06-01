import { Suspense } from "react";
import { AnalysisReportScreen } from "@/components/screens/analysis-report-screen";
import { SkeletonAnalysisReport } from "@/components/ui/skeletons";
import { circleBackButtonClass } from "@/components/ui/circle-back-button";
import { safeTopCompact } from "@/lib/safe-area";
import { cn } from "@/lib/utils";

function ReportPageFallback() {
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className={`shrink-0 bg-background px-4 pb-2.5 ${safeTopCompact}`}>
        <div
          className={cn(circleBackButtonClass, "pointer-events-none opacity-50")}
          aria-hidden
        >
          <span className="size-5" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SkeletonAnalysisReport />
      </div>
    </div>
  );
}

export default function AnalysisReportPage() {
  return (
    <Suspense fallback={<ReportPageFallback />}>
      <AnalysisReportScreen />
    </Suspense>
  );
}
