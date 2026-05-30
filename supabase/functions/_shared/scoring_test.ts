// Tests for the V1 Qualification Engine. Run: deno test (from supabase/functions).

import { assert, assertEquals } from "jsr:@std/assert@1";
import { scoreFit } from "./scoring.ts";
import type { ParsedJob, ParsedResume } from "./types.ts";

const productResume: ParsedResume = {
  skills: ["Figma", "User Research", "Product Strategy", "Design Systems"],
  industries: ["AdTech", "MarTech"],
  workHistory: [
    {
      title: "Senior Product Designer",
      company: "Acme",
      startDate: "2020",
      endDate: null,
      summary: "Dashboarding, analytics, and internal tools for B2B SaaS.",
    },
  ],
  aiExperience: ["AI-assisted workflows", "ChatGPT", "Figma AI"],
  tools: ["Figma", "Amplitude", "Jira"],
  archetypes: ["Product Designer"],
  softwareModels: ["B2B SaaS", "Enterprise Software"],
  roleTitle: "Product Designer",
};

const productJob: ParsedJob = {
  skills: ["Figma", "User Research", "Product Strategy", "Design Systems"],
  industries: ["MarTech"],
  workflows: ["Dashboarding", "Analytics", "Reporting"],
  compensation: { min: 140000, max: 160000, currency: "USD", period: "year" },
  toolRequirements: ["Figma", "Amplitude"],
  aiRequirements: ["AI-assisted workflows"],
  softwareModels: ["B2B SaaS"],
  roleTitle: "Senior Product Designer",
  aiMaturityLevel: 50,
};

Deno.test("V1: skills 3/4 style match contributes to qualification", () => {
  const job: ParsedJob = {
    ...productJob,
    skills: ["Figma", "User Research", "Product Strategy", "Prototyping"],
  };
  const result = scoreFit(productResume, job, { mode: "registered" });
  const skills = result.categoryBreakdown.find((c) => c.category === "skills")!;
  assertEquals(skills.status, "match");
  assertEquals(skills.score, 75);
  assertEquals(skills.matchedCount, 3);
  assertEquals(skills.totalCount, 4);
  assertEquals(skills.contribution, 18.8);
});

Deno.test("V1: tools coverage counts", () => {
  const job: ParsedJob = {
    ...productJob,
    toolRequirements: ["Figma", "Amplitude", "Sketch"],
  };
  const result = scoreFit(productResume, job, { mode: "registered" });
  const tools = result.categoryBreakdown.find((c) => c.category === "tools")!;
  assertEquals(tools.matchedCount, 2);
  assertEquals(tools.totalCount, 3);
  assertEquals(tools.score, 66.7);
});

Deno.test("V1: unknown categories excluded from qualification denominator", () => {
  const job: ParsedJob = {
    skills: ["Figma"],
    industries: [],
    workflows: [],
    compensation: null,
    toolRequirements: [],
    aiRequirements: [],
  };
  const result = scoreFit(productResume, job, { mode: "registered" });
  assert(result.unknownCategories.includes("Industry"));
  assert(!result.categoryBreakdown.some((c) => c.category === "workflow"));
  assert(result.qualificationScore >= 90);
});

Deno.test("V1: missing job skills is unknown not zero penalty", () => {
  const job: ParsedJob = {
    skills: [],
    industries: ["SaaS"],
    workflows: ["Analytics"],
    compensation: null,
    toolRequirements: ["Figma"],
    aiRequirements: [],
  };
  const result = scoreFit(productResume, job, { mode: "registered" });
  const skills = result.categoryBreakdown.find((c) => c.category === "skills")!;
  assertEquals(skills.status, "unknown");
  assert(!result.gaps.some((g) => g.startsWith("Skills:")));
});

Deno.test("V1: guest mode only scores three categories", () => {
  const result = scoreFit(productResume, productJob, { mode: "guest" });
  assertEquals(result.scoringMode, "guest");
  assertEquals(result.categoryBreakdown.length, 3);
  const keys = result.categoryBreakdown.map((c) => c.category);
  assertEquals(keys, ["skills", "industry", "aiEmphasis"]);
});

Deno.test("V1: confidence is separate from qualification", () => {
  const sparseJob: ParsedJob = {
    skills: ["Figma"],
    industries: [],
    workflows: [],
    compensation: null,
    toolRequirements: [],
    aiRequirements: [],
  };
  const result = scoreFit(productResume, sparseJob, { mode: "registered" });
  assert(result.confidenceScore < result.qualificationScore);
  assert(result.fitScore !== result.confidenceScore);
});

Deno.test("V1: career fit adjustment caps final fit at 100", () => {
  const result = scoreFit(productResume, productJob, { mode: "registered" });
  assert(result.fitScore <= 100);
  assert(
    Math.abs(result.fitScore - clampFit(result.qualificationScore, result.careerFitAdjustment)) <
      0.2,
  );
});

function clampFit(q: number, adj: number): number {
  return Math.min(100, Math.max(0, q + adj));
}

Deno.test("V1: recommendation bands", () => {
  const high = scoreFit(productResume, productJob, { mode: "registered" });
  assert(high.fitScore >= 70);
  assert(["strong_apply", "apply"].includes(high.recommendation));

  const unrelated: ParsedResume = {
    skills: ["Phlebotomy"],
    industries: ["Healthcare"],
    workHistory: [{ title: "Nurse", company: "H", startDate: "2015", endDate: null, summary: null }],
    aiExperience: [],
    tools: [],
    archetypes: ["Clinician"],
  };
  const engJob: ParsedJob = {
    skills: ["TypeScript", "React", "PostgreSQL"],
    industries: ["Fintech"],
    workflows: ["API development"],
    compensation: null,
    toolRequirements: ["Docker"],
    aiRequirements: ["LLM integration"],
  };
  const low = scoreFit(unrelated, engJob, { mode: "registered" });
  assert(low.fitScore < 70);
});

Deno.test("V1: scoring is deterministic", () => {
  const a = scoreFit(productResume, productJob, { mode: "registered" });
  const b = scoreFit(productResume, productJob, { mode: "registered" });
  assertEquals(a, b);
});

Deno.test("V1: canonical recommendation labels", () => {
  const high = scoreFit(productResume, productJob, { mode: "registered" });
  assertEquals(high.recommendationLabel, "Strong Pursuit");

  const unrelated: ParsedResume = {
    skills: ["Phlebotomy"],
    industries: ["Healthcare"],
    workHistory: [{ title: "Nurse", company: "H", startDate: "2015", endDate: null, summary: null }],
    aiExperience: [],
    tools: [],
    archetypes: ["Clinician"],
  };
  const engJob: ParsedJob = {
    skills: ["TypeScript", "React", "PostgreSQL", "Kubernetes", "GraphQL"],
    industries: ["Fintech"],
    workflows: ["API development", "Microservices"],
    compensation: null,
    toolRequirements: ["Docker", "Terraform"],
    aiRequirements: ["LLM integration", "RAG"],
  };
  const low = scoreFit(unrelated, engJob, { mode: "registered" });
  const labels = new Set([
    "Strong Pursuit",
    "Good Opportunity",
    "Proceed With Caution",
    "Not Recommended",
  ]);
  assert(labels.has(low.recommendationLabel));
});

Deno.test("V1: explanation and breakdown are populated", () => {
  const result = scoreFit(productResume, productJob, { mode: "registered" });
  assert(result.explanation.length > 20);
  assert(result.categoryBreakdown.length >= 3);
});
