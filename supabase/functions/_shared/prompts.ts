// Prompts for the AI layer. Kept in one place so resume parsing, job parsing,
// and narrative generation stay consistent and reviewable.

import { CANONICAL_INDUSTRY_LIST_PROMPT } from "./tech_industries.ts";
import type { ParsedJob, ParsedResume, ScoreResult } from "./types.ts";

export const RESUME_PARSE_SYSTEM = `
You extract structured data from resumes. Return ONLY valid JSON matching this TypeScript type:

{
  "skills": string[],          // concrete technical + professional skills
  "industries": string[],      // verticals only — see industry rules below
  "workHistory": [{ "title": string, "company": string, "startDate": string|null, "endDate": string|null, "summary": string|null }],
  "aiExperience": string[],    // specific AI/ML experience, tools, or projects
  "tools": string[],           // software, platforms, frameworks used
  "archetypes": string[],
  "softwareModels": string[],  // e.g. "B2B SaaS", "Enterprise Software", "Marketplace"
  "country": string|null,
  "timezone": string|null,
  "desiredCompensation": { "min": number|null, "max": number|null, "currency": string|null, "period": "year"|"month"|"hour"|null }|null,
  "roleTitle": string|null     // primary role, e.g. "Product Designer"
}

industries (resume):
- ONLY market verticals from this list (use exact spelling): ${CANONICAL_INDUSTRY_LIST_PROMPT}
- Infer from employers, products, and clients — NOT from job duties or design/engineering craft.
- NEVER put skills, disciplines, or tools here (e.g. NOT "web design", "mobile app development", "UX", "prototyping") — those belong in skills or tools.

Use [] for absent lists, null for absent optional fields. endDate null means current. Do not invent data.
`.trim();

export const JOB_PARSE_SYSTEM = `
You extract structured data from job descriptions. Return ONLY valid JSON matching this TypeScript type:

{
  "skills": string[],          // required/desired skills
  "industries": string[],      // industries / verticals the role serves (see rules below)
  "workflows": string[],       // leave [] — not used in V1 scoring yet
  "compensation": { "min": number|null, "max": number|null, "currency": string|null, "period": "year"|"month"|"hour"|null } | null,
  "toolRequirements": string[],  // ALL software/platforms/apps (see rules below)
  "bonusToolRequirements": string[],  // tools named in bonus / nice-to-have / preferred sections only
  "aiRequirements": string[],
  "softwareModels": string[],
  "countryRequirement": string|null,  // freelancer location restriction ONLY — see rules below
  "timezoneRequirement": string|null,
  "roleTitle": string|null,
  "aiMaturityLevel": number|null,
  "employerType": "agency"|"product_company"|"unknown",
  "hireTarget": "freelancer"|"agency"|"direct_hire"|"unknown",
  "engagementDuration": "ongoing"|"short_term"|"unknown",
  "engagementPath": "contract_to_hire"|"contract"|"direct_hire"|"unknown",
  "payStructure": "hourly"|"fixed_price"|"salary"|"unknown",
  "postingContextDetail": string|null,
  "postingDetails": {
    "datePosted": string|null,
    "hireArea": string|null,
    "clientRating": string|null,
    "clientOrigin": string|null,
    "clientAverageHourlyRate": string|null,
    "hoursNeeded": string|null,
    "duration": string|null
  }|null
}

Posting context (informational only):
- employerType "agency": creative/marketing/dev studio, consultancy, firm serving multiple clients.
- employerType "product_company": one product/SaaS/startup hiring for their own product.
- hireTarget "freelancer": contract, freelance, 1099, consultant, Upwork, project-based, hourly contractor.
- hireTarget "agency": vendor, subcontract, creative partner, agency of record, RFP to agency.
- hireTarget "direct_hire": full-time, FTE, employee, W2, join our team (not freelance, not hiring an agency).
- engagementDuration "ongoing": retainer, ongoing projects, long-term, continuous, open-ended, permanent engagement.
- engagementDuration "short_term": one-off project, temporary, fixed duration, N weeks/months, single engagement.
- engagementPath "contract_to_hire": contract-to-hire, temp-to-perm, conversion to full-time/FTE after contract.
- engagementPath "contract": freelance/contractor/1099 engagement without stated conversion to hire (use when not contract_to_hire).
- engagementPath "direct_hire": W2/FTE/staff role with no contract phase (align with hireTarget direct_hire when clear).
- payStructure "hourly": hourly rate, $/hr, per hour (also set compensation.period "hour" when amounts present).
- payStructure "fixed_price": fixed fee, flat rate, fixed budget, lump sum, total project price (not hourly, not annual salary).
- payStructure "salary": annual/monthly salary, W2 pay band, compensation.period "year" or "month".
- Use "unknown" when unclear. postingContextDetail: one short sentence citing evidence.

Upwork / freelance platform postings:
- When the paste includes "Skills and Expertise" with "Mandatory skills" tags, put ONLY those
  tagged skill names in skills[] (verbatim). Do NOT mine extra skills from the job body.
- Optional/nice-to-have skill tags in that section may be included in skills[] after mandatory tags.
- Platform tool names (Figma, Tableau, DV360, etc.) belong in toolRequirements, not skills.

Skills vs toolRequirements (critical):
- toolRequirements: EVERY software, app, platform, framework, or creative tool named anywhere in the posting.
  Include required AND optional items. Scan the ENTIRE document: requirements, responsibilities,
  qualifications, tech stack, "bonus", "bonuses", "nice to have", "preferred", "a plus", "desired", "helpful".
  Examples of tools (not skills): Figma, After Effects, Lottie, Blender, Premiere, Photoshop, Webflow, Jira, Amplitude.
- skills: professional capabilities and craft (e.g. "user research", "design systems", "prototyping",
  "stakeholder management") — NOT software product names. If unsure whether something is a tool, put it in toolRequirements.
- Use short canonical names ("After Effects" not "Adobe After Effects CC 2024").
- Do not omit tools because they appear only in a bonus or nice-to-have section.
- bonusToolRequirements: tools that appear in bonus, nice-to-have, preferred, "a plus", or similar optional sections
  (subset of toolRequirements; use [] if none).

industries (job posting):
- ONLY market verticals from this list (use exact spelling): ${CANONICAL_INDUSTRY_LIST_PROMPT}
- Infer from company description, product type, clients served, or explicit "industry" lines.
- NEVER put skills, disciplines, or tools here (e.g. NOT "web design", "mobile app development", "user research") — use skills or toolRequirements instead.

workflows: always return [] (not used in V1).

countryRequirement (freelancer hire location — NOT clientOrigin):
- Set ONLY when the posting restricts where freelancers may apply: Upwork header line after "Posted …" (e.g. "Worldwide", "Only freelancers located in the U.S. may apply"), Preferred qualifications Location/Country, or explicit "hire in / talent must be in" lines.
- Use null when the only country mentioned is the client's base in "About the client" (postingDetails.clientOrigin) — that is where the client is based, not who they want to hire.
- "Worldwide" or global remote → null (no specific country requirement).

postingDetails (informational only — NOT used in scoring):
- Extract only when explicitly stated in the posting (common on freelance platforms).
- datePosted: when the job was posted, as written (e.g. "Posted 2 days ago", "Mar 15, 2025").
- hireArea: "Looking to hire in …", talent location, or geographic restriction for applicants.
- clientRating: client star rating or score as written (e.g. "4.9 of 5", "5.0").
- clientOrigin: client's country/location when shown (e.g. "United States", "Client's country: Germany").
- clientAverageHourlyRate: average hourly rate the client has paid, verbatim (e.g. "$45.00/hr").
- hoursNeeded: weekly hours expectation (e.g. "More than 30 hours per week", "Less than 10 hrs/week").
- duration: project/engagement length as written (e.g. "3 to 6 months", "Less than 1 month") — not the same as engagementDuration enum.
- roleTitle: canonical role only (e.g. "Senior UX Strategist / Product UX Designer") — omit marketing tails after "for" (e.g. "for AI-Powered AdTech SaaS Platform") and omit "at CompanyName".
- Use null for each field when absent. Do not invent platform stats.

Use [] for absent lists, null for absent optional fields. Do not invent compensation or location unless stated.
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
