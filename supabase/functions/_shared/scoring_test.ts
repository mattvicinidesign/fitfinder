// Tests for the Opportunity Engine. Run: deno test (from supabase/functions).

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

Deno.test("Opportunity Engine: qualifications match ratio", () => {
  const job: ParsedJob = {
    ...productJob,
    skills: ["Figma", "User Research", "Product Strategy", "Prototyping"],
  };
  const result = scoreFit(productResume, job, { mode: "registered" });
  const qual = result.opportunityCategories!.find((c) =>
    c.category === "qualificationsMatch"
  )!;
  assert(qual.totalCount! >= 4);
  assert(qual.matchedCount! >= 3);
  assert(qual.score >= 50);
});

Deno.test("Opportunity Engine: product role scores higher than brand role", () => {
  const product = scoreFit(productResume, productJob, { mode: "registered" });
  const brandJob: ParsedJob = {
    ...productJob,
    roleTitle: "Brand Designer",
    skills: ["Brand guidelines", "Creative assets", "Figma"],
  };
  const brand = scoreFit(productResume, brandJob, { mode: "registered" });
  assert(product.fitScore > brand.fitScore);
  const brandRole = brand.opportunityCategories!.find((c) =>
    c.category === "roleAlignment"
  )!;
  assert(brandRole.score < 50);
});

Deno.test("Opportunity Engine: guest mode scores three categories", () => {
  const result = scoreFit(productResume, productJob, { mode: "guest" });
  assertEquals(result.scoringMode, "guest");
  assertEquals(result.opportunityCategories!.length, 3);
  const keys = result.opportunityCategories!.map((c) => c.category);
  assertEquals(keys, ["roleAlignment", "qualificationsMatch", "industryAlignment"]);
});

Deno.test("Opportunity Engine: registered mode scores five categories", () => {
  const result = scoreFit(productResume, productJob, { mode: "registered" });
  assertEquals(result.opportunityCategories!.length, 5);
});

Deno.test("Opportunity Engine: strong product match recommends pursuit", () => {
  const result = scoreFit(productResume, productJob, { mode: "registered" });
  assert(result.fitScore >= 70);
  assert(["strong_apply", "apply"].includes(result.recommendation));
});

Deno.test("Opportunity Engine: unrelated resume scores low", () => {
  const unrelated: ParsedResume = {
    skills: ["Phlebotomy"],
    industries: ["Healthcare"],
    workHistory: [
      {
        title: "Nurse",
        company: "H",
        startDate: "2015",
        endDate: null,
        summary: null,
      },
    ],
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
    roleTitle: "Senior Software Engineer",
  };
  const low = scoreFit(unrelated, engJob, { mode: "registered" });
  assert(low.fitScore < 70);
});

Deno.test("Opportunity Engine: canonical recommendation labels", () => {
  const high = scoreFit(productResume, productJob, { mode: "registered" });
  const labels = new Set([
    "Strong Pursuit",
    "Good Opportunity",
    "Proceed With Caution",
    "Not Recommended",
  ]);
  assert(labels.has(high.recommendationLabel));

  const unrelated: ParsedResume = {
    skills: ["Phlebotomy"],
    industries: ["Healthcare"],
    workHistory: [
      {
        title: "Nurse",
        company: "H",
        startDate: "2015",
        endDate: null,
        summary: null,
      },
    ],
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
    roleTitle: "Senior Software Engineer",
  };
  const low = scoreFit(unrelated, engJob, { mode: "registered" });
  assert(labels.has(low.recommendationLabel));
});

Deno.test("Opportunity Engine: scoring is deterministic", () => {
  const a = scoreFit(productResume, productJob, { mode: "registered" });
  const b = scoreFit(productResume, productJob, { mode: "registered" });
  assertEquals(a.fitScore, b.fitScore);
  assertEquals(a.recommendation, b.recommendation);
});

Deno.test("Opportunity Engine: debug payload is populated", () => {
  const result = scoreFit(productResume, productJob, { mode: "registered" });
  assert(result.opportunityDebug);
  assert(result.opportunityDebug!.detectedRoleArchetype);
  assert(result.opportunityDebug!.categoryScores.length >= 3);
  assert(result.opportunityDebug!.weightingCalculation.length > 10);
  assert(result.opportunityDebug!.finalReasoning.length > 10);
});

Deno.test("Opportunity Engine: legacy categoryBreakdown is empty", () => {
  const result = scoreFit(productResume, productJob, { mode: "registered" });
  assertEquals(result.categoryBreakdown.length, 0);
});

Deno.test("Opportunity Engine: fit score capped at 100", () => {
  const result = scoreFit(productResume, productJob, { mode: "registered" });
  assert(result.fitScore <= 100);
  assert(result.fitScore >= 0);
});

Deno.test("Opportunity Engine: contract-to-hire note in role alignment", () => {
  const jobText = [
    "Contract-to-hire opportunity",
    "This lets talent know that this job could become full time.",
    "Senior Product Designer needed for B2B SaaS.",
  ].join("\n");
  const result = scoreFit(productResume, productJob, {
    mode: "registered",
    jobText,
  });
  const role = result.opportunityCategories!.find((c) =>
    c.category === "roleAlignment"
  )!;
  assert(role.details?.includes("Contract-To-Hire"));
});
