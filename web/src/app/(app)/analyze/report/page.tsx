import { Suspense } from "react";
import { AnalysisReportScreen } from "@/components/screens/analysis-report-screen";

export default function AnalysisReportPage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-12 text-center text-[15px] text-muted-foreground">
          Loading report…
        </p>
      }
    >
      <AnalysisReportScreen />
    </Suspense>
  );
}
