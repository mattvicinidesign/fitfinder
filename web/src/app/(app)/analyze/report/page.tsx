import { Suspense } from "react";
import { AnalysisReportScreen } from "@/components/screens/analysis-report-screen";
import { SkeletonAnalysisReport } from "@/components/ui/skeletons";

function ReportPageFallback() {
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/60 bg-background px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5">
        <div className="h-5 w-5" />
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
