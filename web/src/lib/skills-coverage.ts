import { skillsCoverageDetail as detail } from "@/lib/coverage-detail";
import type { ParsedJob, ParsedResume } from "@/lib/types";

export type { CoverageMatchDetail as SkillMatchDetail } from "@/lib/types";
export { skillsCoverageDetail } from "@/lib/coverage-detail";

export function skillsCoverageCounts(
  job: ParsedJob,
  resume?: ParsedResume | null,
): { matched: number; total: number } {
  const { matched, total } = detail(job, resume);
  return { matched, total };
}
