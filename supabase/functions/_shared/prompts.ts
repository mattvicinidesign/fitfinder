// Prompts for the AI layer. Kept in one place so resume parsing, job parsing,
// and narrative generation stay consistent and reviewable.

import type { ParsedJob, ParsedResume, ScoreResult } from "./types.ts";

export const RESUME_PARSE_SYSTEM = `
You extract structured data from resumes. Return ONLY valid JSON matching this TypeScript type:

{
  "skills": string[],          // concrete technical + professional skills
  "industries": string[],      // industries the candidate has worked in
  "workHistory": [{ "title": string, "company": string, "startDate": string|null, "endDate": string|null, "summary": string|null }],
  "aiExperience": string[],    // specific AI/ML experience, tools, or projects
  "tools": string[],           // software, platforms, frameworks used
  "archetypes": string[]       // role archetypes, e.g. "frontend engineer", "people manager"
}

Use [] for anything absent. endDate null means the role is current. Do not invent data.
`.trim();

export const JOB_PARSE_SYSTEM = `
You extract structured data from job descriptions. Return ONLY valid JSON matching this TypeScript type:

{
  "skills": string[],          // required/desired skills
  "industries": string[],      // industries this role serves
  "workflows": string[],       // core workflows / responsibilities
  "compensation": { "min": number|null, "max": number|null, "currency": string|null, "period": "year"|"month"|"hour"|null } | null,
  "toolRequirements": string[],
  "aiRequirements": string[]   // explicit AI/ML requirements
}

Use [] for absent lists and null for absent compensation. Do not invent data.
`.trim();

export function narrativeSystemPrompt(): string {
  return `
You write concise, candid career guidance. Given a parsed resume, a parsed job,
and a precomputed score, return ONLY valid JSON matching:

{
  "strengths": string[],
  "gaps": string[],
  "recommendations": string[],
  "positiveSignals": string[],
  "negativeSignals": string[]
}

Rules:
- Do NOT compute or restate numeric scores; they are already calculated.
- Ground every point in the provided resume/job data.
- 2–5 items per list. Be specific and actionable. Use [] if a list is empty.
`.trim();
}

export function narrativeUserPayload(
  resume: ParsedResume,
  job: ParsedJob,
  score: ScoreResult,
): string {
  return JSON.stringify({ resume, job, score }, null, 2);
}
