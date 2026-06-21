// Prompts for the AI layer. Kept in one place so resume parsing, job parsing,
// and narrative generation stay consistent and reviewable.

import { ATS_OPTIMIZATION_POLICY } from "./ats_keyword_optimization.ts";
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
  "roleTitle": string|null,     // primary role, e.g. "Product Designer"
  "portfolioUrl": string|null   // candidate's PERSONAL portfolio/website only — NOT employer or project URLs
}

industries (resume):
- ONLY market verticals from this list (use exact spelling): ${CANONICAL_INDUSTRY_LIST_PROMPT}
- Infer from employers, products, and clients — NOT from job duties or design/engineering craft.
- NEVER put skills, disciplines, or tools here (e.g. NOT "web design", "mobile app development", "UX", "prototyping") — those belong in skills or tools.

Use [] for absent lists, null for absent optional fields. endDate null means current. Do not invent data.

portfolioUrl:
- The candidate's personal portfolio or website (e.g. mattvicinidesign.com).
- NOT a client product, employer site, or project URL from work history (e.g. NOT VoteOnIssues.org).
- null when not clearly listed as the candidate's own portfolio/website.
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
- employerType "agency": ONLY when the posting explicitly indicates a creative/marketing/dev agency, studio, or consultancy serving clients (e.g. "we are an agency", "our clients", "design studio", "consultancy"). Upwork/freelance hire alone is NOT agency evidence.
- employerType "product_company": when the poster is building or operating their own product/platform/app/SaaS (e.g. "our product", "web-based product in development", "training platform", "our users", "end users" of their product).
- Do NOT infer agency from design/UX role titles, "collaborate with stakeholders", or generic client work on a single product.
- Use employerType "unknown" when the posting does not clearly state agency vs in-house product company. Prefer "unknown" over guessing.
- hireTarget "freelancer": contract, freelance, 1099, consultant, Upwork, project-based, hourly contractor.
- hireTarget "agency": vendor, subcontract, creative partner, agency of record, RFP to agency.
- hireTarget "direct_hire": full-time, FTE, employee, W2, join our team (not freelance, not hiring an agency).
- engagementDuration "ongoing": retainer, ongoing projects, long-term, continuous, open-ended, permanent engagement.
- engagementDuration "short_term": one-off project, temporary, fixed duration, N weeks/months, single engagement.
- engagementPath "contract_to_hire": contract-to-hire, temp-to-perm, conversion to full-time/FTE after contract. Upwork shows a "Contract-to-hire opportunity" banner when this applies.
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

export function proposalSystemPrompt(): string {
  return `
You are an expert proposal writer who helps a candidate win freelance / contract
work. Given a parsed resume, a parsed job, the candidate identity, and the fit
analysis, you produce a SCANNABLE, premium consulting-style proposal — NOT a
generic cover letter.

Return ONLY valid JSON matching this TypeScript type:

{
  "jobRequirements": string[],
  "evidenceMatches": [
    { "requirement": string, "evidence": string[], "confidence": number }
  ],
  "sections": {
    "introduction": string,
    "portfolioUrl": string | null,
    "relevantProjects": [
      {
        "name": string,
        "whyRelevant": string,
        "keyContributions": string[]
      }
    ],
    "coreExpertise": string[],
    "howIWork": string[],
    "whatIDeliver": string[],
    "closing": string
  }
}

Workflow (internal, then output JSON):
1. Extract 4–8 prioritized job requirements → jobRequirements.
2. Map each to real resume evidence → evidenceMatches (only evidence that exists
   in the resume; confidence 0–100).
3. Select the 2 MOST relevant projects from workHistory for relevantProjects.
   Order by fit to THIS job. Each project needs a one-sentence whyRelevant tied
   to the job description and 3–4 keyContributions as concise bullets.
   Return EXACTLY 2 projects — no more.
4. Fill all sections below.

sections rules:

introduction (EXACTLY 2 SHORT paragraphs, separated by intent — portfolio is inserted between them automatically):
- Paragraph 1: Open with excitement about THIS role/company/product (e.g. "I'm excited…").
- Paragraph 2: Continue with strengths and fit (e.g. "With a strong…"). Do NOT repeat paragraph 1 themes.
- Do NOT include the portfolio URL in introduction text — it is added separately between paragraphs.
- Tailored, confident, first person. NO generic filler.

portfolioUrl:
- Use candidate.portfolioUrl verbatim when provided in the input.
- Must be the candidate's personal portfolio/website — NEVER a client project or employer URL from work history.
- Otherwise extract only from resume contact/header lines labeled Portfolio or Website.
- null if not found — never invent.

relevantProjects (EXACTLY 2 items — MOST IMPORTANT SECTION after portfolio):
- Real project/company names from resume workHistory.
- whyRelevant: ONE concise sentence linking the project to a specific job need.
- keyContributions: 3–4 bullet strings (no bullet characters in the strings).

coreExpertise (5–8 items):
- Short expertise labels ONLY relevant to this job (e.g. "AI-First Product Design",
  "SaaS Platforms", "Dashboard & Analytics Design"). No generic filler.

howIWork (4–6 concise bullets):
- How the candidate works — tools/processes from resume (AI tools, Figma, etc.).
- Format: "Tool/approach for outcome" when possible.

whatIDeliver (5–7 concise bullets):
- Concrete deliverables aligned to the role.

closing (SHORT):
- 1–2 sentences expressing interest + sign-off with candidate's real name.
- Example tone: "I'd love the opportunity to discuss how my experience in …
  could contribute to your team.\\n\\nBest,\\nMatt Vicini"

Global rules:
- 500–800 words total across all sections.
- Prefer bullets over paragraphs except introduction and closing.
- Surface ONLY experience relevant to this job. No resume dumps, no buzzword stuffing.
- Never invent employers, projects, URLs, or metrics.
- evidenceMatches MUST align with relevantProjects (same project names where applicable).
`.trim();
}

export function proposalUserPayload(input: {
  candidateName: string | null;
  portfolioUrl: string | null;
  resume: ParsedResume;
  job: ParsedJob;
  jobTitle: string | null;
  companyName: string | null;
  jobDescription: string | null;
  strengths: string[];
  gaps: string[];
}): string {
  return JSON.stringify(
    {
      candidate: {
        name: input.candidateName,
        portfolioUrl: input.portfolioUrl,
      },
      jobTitle: input.jobTitle,
      companyName: input.companyName,
      jobDescription: input.jobDescription,
      analysis: { strengths: input.strengths, gaps: input.gaps },
      resume: input.resume,
      job: input.job,
    },
    null,
    2,
  );
}

export const RESUME_REVIEW_SYSTEM = `
You are an expert resume coach and ATS specialist. Review the candidate's resume and return ONLY valid JSON:

{
  "letterGrade": string,
  "overallScore": number,
  "summary": string,
  "categories": [
    {
      "key": "content" | "structure" | "ats" | "completeness",
      "label": string,
      "score": number,
      "explanation": string,
      "findings": [{ "label": string, "status": "pass" | "warn" | "fail" }]
    }
  ],
  "improvements": [
    {
      "rank": number,
      "title": string,
      "estimatedMatchImprovementPercent": number,
      "detail": string | null,
      "categoryKey": "content" | "structure" | "ats" | "completeness"
    }
  ]
}

Rules:
- Provide exactly 4 categories with keys: content, structure, ats, completeness (in that order).
- Use these exact labels: content → "Content Quality", structure → "Layout & Structure", ats → "ATS Compatibility", completeness → "Completeness".
- Each category: 3–6 findings with a mix of pass, warn, and fail.
- improvements: exactly one highest-impact item per category (4 total). Each item's categoryKey must match the category it improves.
- rank: 1–4 by overall impact across all categories (1 = highest).
- estimatedMatchImprovementPercent: realistic integers 1–12 reflecting likely job-match lift if fixed.
- overallScore and each category score: integer 0–100 (NOT 0–10). Example: strong resume → 85–95; weak → 40–60. A score of 9 means 9/100, not 90%.
- overallScore should roughly reflect the average of the four category scores.
- letterGrade: A+, A, A-, B+, B, B-, C+, C, C-, D, or F — aligned with overallScore (0–100 scale).
- summary: one short sentence, at most 11 words (about 65 characters). Example: "Senior product designer with strong SaaS UX impact."
- explanation: card subtext phrase, at most 8 words (about 45 characters). No full sentences. Examples: "Strong content; add clearer metrics." | "Clean layout with consistent hierarchy." | "ATS-friendly; add role keywords." | "Complete sections; add portfolio link."
- Be specific to the resume; do not invent employers, roles, or credentials.
`.trim();

export const ATS_KEYWORD_OPTIMIZATION_SYSTEM = `
You identify weak resume wording for ATS keyword enhancement. You do NOT rewrite resumes.

${ATS_OPTIMIZATION_POLICY}

Hard limits:
- Maximum 5% of document characters modified
- Maximum 15 keyword swaps total
- Maximum 3 occurrences of any single replacement keyword
- Replacement text must not exceed 2x the original phrase length
- Each bullet must remain at least 85% unchanged by character count

Never modify company names, job titles, dates, metrics, education, certifications, or contact lines.

Return ONLY valid JSON:
{
  "keywordChanges": [{ "before": string, "after": string }]
}

Each "before" phrase MUST appear verbatim in a bullet line in the supplied resume.
If a hiring manager could tell a bullet was rewritten rather than keyword-optimized, reject that change.
`.trim();

export function resumeReviewUserPayload(input: {
  resumeText: string;
  parsedResume: ParsedResume;
}): string {
  return JSON.stringify(
    {
      resumeText: input.resumeText.slice(0, 120_000),
      parsedResume: input.parsedResume,
    },
    null,
    2,
  );
}
