// Tests for the scoring engine. Run with: deno test (from supabase/functions).
// These lock in the behavior both clients depend on and prove determinism.

import { assertEquals, assert } from "jsr:@std/assert@1";
import { scoreFit } from "./scoring.ts";
import type { ParsedJob, ParsedResume } from "./types.ts";

const strongResume: ParsedResume = {
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "GraphQL", "AWS"],
  industries: ["Fintech", "SaaS"],
  workHistory: [
    { title: "Senior Engineer", company: "Acme", startDate: "2020", endDate: null, summary: null },
    { title: "Engineer", company: "Beta", startDate: "2017", endDate: "2020", summary: null },
  ],
  aiExperience: ["LLM integration", "RAG pipelines"],
  tools: ["Docker", "Kubernetes", "Figma"],
  archetypes: ["frontend engineer", "full stack engineer"],
};

const matchingJob: ParsedJob = {
  skills: ["TypeScript", "React", "PostgreSQL"],
  industries: ["Fintech"],
  workflows: ["frontend engineer"],
  compensation: { min: 150000, max: 200000, currency: "USD", period: "year" },
  toolRequirements: ["Docker"],
  aiRequirements: ["LLM integration"],
};

Deno.test("strong resume against matching job scores high", () => {
  const result = scoreFit(strongResume, matchingJob);
  assert(result.qualificationScore >= 90, `qualification was ${result.qualificationScore}`);
  assert(result.fitScore >= 80, `fit was ${result.fitScore}`);
  assertEquals(result.recommendation, "strong_apply");
});

Deno.test("scoring is deterministic", () => {
  const a = scoreFit(strongResume, matchingJob);
  const b = scoreFit(strongResume, matchingJob);
  assertEquals(a, b);
});

Deno.test("no required signals yields full coverage but neutral-ish fit", () => {
  const emptyJob: ParsedJob = {
    skills: [],
    industries: [],
    workflows: [],
    compensation: null,
    toolRequirements: [],
    aiRequirements: [],
  };
  const result = scoreFit(strongResume, emptyJob);
  assertEquals(result.qualificationScore, 100);
  // Low job signal lowers confidence, pulling fit toward the neutral midpoint.
  assert(result.confidenceScore < 100);
});

Deno.test("sparse inputs lower confidence", () => {
  const sparseResume: ParsedResume = {
    skills: ["Excel"],
    industries: [],
    workHistory: [],
    aiExperience: [],
    tools: [],
    archetypes: [],
  };
  const result = scoreFit(sparseResume, matchingJob);
  assert(result.confidenceScore < 60, `confidence was ${result.confidenceScore}`);
});

Deno.test("complete mismatch is not recommended", () => {
  const unrelatedResume: ParsedResume = {
    skills: ["Phlebotomy", "Patient care"],
    industries: ["Healthcare"],
    workHistory: [
      { title: "Nurse", company: "Hospital", startDate: "2015", endDate: null, summary: null },
    ],
    aiExperience: [],
    tools: ["EHR"],
    archetypes: ["clinician"],
  };
  const result = scoreFit(unrelatedResume, matchingJob);
  assert(result.fitScore < 55, `fit was ${result.fitScore}`);
});
