// Tests for the semantic matching engine. Run: deno test (from supabase/functions).

import { assert, assertEquals } from "jsr:@std/assert@1";
import { buildScoreResultFromSemanticReport } from "./semantic_match/score_result.ts";
import {
  applyEvidenceBoost,
  matchProfilesDeterministic,
} from "./semantic_match/match.ts";
import { buildSemanticMatchReport } from "./semantic_match/report.ts";
import {
  computeOverallMatchPercent,
  scoreSemanticCategories,
} from "./semantic_match/score.ts";
import type {
  CanonicalCompetency,
  CanonicalProfile,
  CompetencyMatchResult,
  SemanticMatchReport,
} from "./semantic_match/types.ts";

function competency(
  id: string,
  label: string,
  category: CanonicalCompetency["category"],
  importance: CanonicalCompetency["importance"] = "required",
  evidenceCount = 1,
): CanonicalCompetency {
  return {
    id,
    canonicalLabel: label,
    category,
    importance,
    evidenceCount,
    sourcePhrases: [label],
  };
}

const designResume: CanonicalProfile = {
  competencies: [
    competency("c1", "Research", "skillsTools", "required", 3),
    competency("c2", "UX Execution", "skillsTools", "required", 2),
    competency("c3", "Product Analytics", "skillsTools", "required", 2),
    competency("c4", "Cross-functional Leadership", "domainBackground", "required", 1),
  ],
  seniority: "Senior",
  yearsExperience: 8,
  industries: ["SaaS", "MarTech"],
  accomplishments: ["Shipped analytics dashboard"],
  quantifiedImpact: ["Increased activation 12%"],
};

const designJob: CanonicalProfile = {
  competencies: [
    competency("j1", "Research", "skillsTools", "required"),
    competency("j2", "UX Execution", "skillsTools", "required"),
    competency("j3", "Product Analytics", "skillsTools", "preferred"),
    competency("j4", "Design Systems", "skillsTools", "bonus"),
  ],
  seniority: "Senior",
  yearsExperience: 6,
  industries: ["MarTech"],
  accomplishments: [],
  quantifiedImpact: [],
};

Deno.test("Semantic match: deterministic exact and partial matches", () => {
  const matches = matchProfilesDeterministic(designResume, designJob);
  assertEquals(matches.length, 4);

  const research = matches.find((m) => m.jobLabel === "Research")!;
  assert(research.similarityScore >= 95);

  const analytics = matches.find((m) => m.jobLabel === "Product Analytics")!;
  assert(analytics.similarityScore >= 70);

  const missing = matches.find((m) => m.jobLabel === "Design Systems")!;
  assertEquals(missing.similarityScore, 0);
  assertEquals(missing.matchKind, "missing");
});

Deno.test("Semantic match: evidence boost increases confidence", () => {
  const base: CompetencyMatchResult[] = [
    {
      jobCompetencyId: "j1",
      jobLabel: "Research",
      resumeCompetencyId: "c1",
      resumeLabel: "Research",
      canonicalLabel: "Research",
      category: "skillsTools",
      importance: "required",
      similarityScore: 90,
      matchKind: "strong",
      evidenceCount: 4,
      reasoning: "test",
    },
  ];

  const boosted = applyEvidenceBoost(base);
  assert(boosted[0].similarityScore > base[0].similarityScore);
});

Deno.test("Semantic match: category weights sum to overall percent", () => {
  const matches = matchProfilesDeterministic(designResume, designJob);
  const boosted = applyEvidenceBoost(matches);
  const report = buildSemanticMatchReport(boosted, designResume, designJob);

  assert(report.categoryScores.length === 4);
  assert(report.overallMatchPercent >= 0 && report.overallMatchPercent <= 100);

  const recomputed = computeOverallMatchPercent(report.categoryScores);
  assertEquals(report.overallMatchPercent, recomputed);
});

Deno.test("Semantic match: experience scoring respects years gap", () => {
  const lowExpResume: CanonicalProfile = {
    ...designResume,
    yearsExperience: 2,
  };
  const matches = matchProfilesDeterministic(lowExpResume, designJob);
  const categories = scoreSemanticCategories(matches, lowExpResume, designJob);
  const experience = categories.find((c) => c.category === "experience")!;
  assert(experience.score < 60);
});

Deno.test("Semantic score result: exposes semantic report without legacy categories", () => {
  const matches = applyEvidenceBoost(
    matchProfilesDeterministic(designResume, designJob),
  );
  const report: SemanticMatchReport = buildSemanticMatchReport(
    matches,
    designResume,
    designJob,
  );

  const result = buildScoreResultFromSemanticReport(report, "registered");
  assertEquals(result.careerFitAdjustment, 0);
  assert(result.semanticMatchReport != null);
  assertEquals(result.fitScore, report.overallMatchPercent);
  assertEquals(result.opportunityCategories, undefined);
  assertEquals(result.categoryBreakdown.length, 0);
});

Deno.test("Semantic score result: recommendation labels are canonical", () => {
  const strongReport: SemanticMatchReport = {
    ...buildSemanticMatchReport(
      applyEvidenceBoost(matchProfilesDeterministic(designResume, designJob)),
      designResume,
      designJob,
    ),
    overallMatchPercent: 88,
  };
  const result = buildScoreResultFromSemanticReport(strongReport, "registered");
  const labels = new Set([
    "Strong Pursuit",
    "Good Opportunity",
    "Proceed With Caution",
    "Not Recommended",
  ]);
  assert(labels.has(result.recommendationLabel));
  assertEquals(result.recommendation, "strong_apply");
});

Deno.test("Semantic match: unrelated profiles score lower", () => {
  const nurseResume: CanonicalProfile = {
    competencies: [
      competency("n1", "Medication Management", "skillsTools"),
      competency("n2", "Patient Care", "responsibilities"),
    ],
    seniority: "Staff",
    yearsExperience: 10,
    industries: ["Healthcare"],
    accomplishments: [],
    quantifiedImpact: [],
  };

  const engJob: CanonicalProfile = {
    competencies: [
      competency("e1", "Backend Development", "skillsTools", "required"),
      competency("e2", "Distributed Systems", "skillsTools", "required"),
      competency("e3", "TypeScript", "skillsTools", "required"),
    ],
    seniority: "Senior",
    yearsExperience: 5,
    industries: ["Fintech"],
    accomplishments: [],
    quantifiedImpact: [],
  };

  const designResult = buildSemanticMatchReport(
    applyEvidenceBoost(matchProfilesDeterministic(designResume, designJob)),
    designResume,
    designJob,
  );
  const unrelatedResult = buildSemanticMatchReport(
    applyEvidenceBoost(matchProfilesDeterministic(nurseResume, engJob)),
    nurseResume,
    engJob,
  );

  assert(designResult.overallMatchPercent > unrelatedResult.overallMatchPercent);
});
