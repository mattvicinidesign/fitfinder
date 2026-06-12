import { OPPORTUNITY_CATEGORY_LABELS, OPPORTUNITY_CATEGORY_WEIGHTS } from "@/lib/scoring-terminology";
import type {
  AnalysisResult,
  OpportunityCategoryScore,
  ParsedJob,
  ParsedResume,
  Recommendation,
} from "@/lib/types";

const SAMPLE_RESUME: ParsedResume = {
  skills: [
    "Figma",
    "User Research",
    "Product Strategy",
    "Design Systems",
    "Prototyping",
  ],
  industries: ["SaaS", "MarTech", "AdTech"],
  workHistory: [
    {
      title: "Senior Product Designer",
      company: "Northline",
      startDate: "2020",
      endDate: null,
      summary: "Led B2B SaaS product design and design systems.",
    },
  ],
  aiExperience: ["ChatGPT", "Figma AI", "AI-assisted workflows"],
  tools: ["Figma", "Amplitude", "Jira", "Notion"],
  archetypes: ["Product Designer"],
  softwareModels: ["B2B SaaS", "Enterprise Software"],
  country: "United States",
  timezone: "America/Los_Angeles",
  roleTitle: "Product Designer",
};

export interface SampleReportInput {
  jobTitle: string;
  companyName: string;
  hireArea: string;
  fitScore: number;
  qualificationScore: number;
  confidenceScore: number;
  recommendation: Recommendation;
  recommendationLabel: string;
}

function buildJobDescription(title: string, company: string, hireArea: string): string {
  return `${title} at ${company}

We are looking for an experienced designer to partner on product work.

About the client
${company}
United States
San Francisco 10:00 AM
4.9 of 5 reviews
$72.00 /hr avg hourly rate paid
30+ hrs/week
3 to 6 months
${hireArea}
`;
}

function buildParsedJob(title: string, hireArea: string): ParsedJob {
  return {
    skills: ["Figma", "User Research", "Design Systems", "Prototyping"],
    industries: ["SaaS", "MarTech"],
    workflows: ["Dashboarding", "User flows", "Reporting"],
    compensation: { min: 65, max: 95, currency: "USD", period: "hour" },
    toolRequirements: ["Figma", "Amplitude"],
    bonusToolRequirements: [],
    aiRequirements: ["AI-assisted design"],
    roleTitle: title,
    employerType: "product_company",
    hireTarget: "freelancer",
    postingDetails: {
      datePosted: "4 days ago",
      hireArea,
      clientRating: "4.9 of 5 reviews",
      clientOrigin: "United States",
      clientCity: "San Francisco",
      clientAverageHourlyRate: "$72.00 /hr",
      hoursNeeded: "30+ hrs/week",
      duration: "3 to 6 months",
    },
  };
}

/** Opportunity Engine categories tuned to the target fit score (0–100). */
function buildOpportunityCategories(targetFit: number): OpportunityCategoryScore[] {
  const scale = targetFit / 89;
  const scaled = (base: number) => Math.min(100, Math.round(base * scale));
  const contrib = (weight: number, score: number) =>
    Math.round(weight * (score / 100) * 10) / 10;

  const roleScore = scaled(92);
  const qualScore = scaled(88);
  const industryScore = scaled(85);
  const prefScore = scaled(72);
  const clientScore = scaled(78);

  return [
    {
      category: "roleAlignment",
      label: OPPORTUNITY_CATEGORY_LABELS.roleAlignment,
      score: roleScore,
      weight: OPPORTUNITY_CATEGORY_WEIGHTS.roleAlignment,
      contribution: contrib(OPPORTUNITY_CATEGORY_WEIGHTS.roleAlignment, roleScore),
    },
    {
      category: "qualificationsMatch",
      label: OPPORTUNITY_CATEGORY_LABELS.qualificationsMatch,
      score: qualScore,
      weight: OPPORTUNITY_CATEGORY_WEIGHTS.qualificationsMatch,
      contribution: contrib(OPPORTUNITY_CATEGORY_WEIGHTS.qualificationsMatch, qualScore),
      matchedCount: 8,
      totalCount: 10,
    },
    {
      category: "industryAlignment",
      label: OPPORTUNITY_CATEGORY_LABELS.industryAlignment,
      score: industryScore,
      weight: OPPORTUNITY_CATEGORY_WEIGHTS.industryAlignment,
      contribution: contrib(OPPORTUNITY_CATEGORY_WEIGHTS.industryAlignment, industryScore),
    },
    {
      category: "preferenceAlignment",
      label: OPPORTUNITY_CATEGORY_LABELS.preferenceAlignment,
      score: prefScore,
      weight: OPPORTUNITY_CATEGORY_WEIGHTS.preferenceAlignment,
      contribution: contrib(OPPORTUNITY_CATEGORY_WEIGHTS.preferenceAlignment, prefScore),
    },
    {
      category: "clientQuality",
      label: OPPORTUNITY_CATEGORY_LABELS.clientQuality,
      score: clientScore,
      weight: OPPORTUNITY_CATEGORY_WEIGHTS.clientQuality,
      contribution: contrib(OPPORTUNITY_CATEGORY_WEIGHTS.clientQuality, clientScore),
    },
  ];
}

/** Full analysis payload — same shape as a live analyze response (web source of truth). */
export function buildSampleAnalysisResult(input: SampleReportInput): AnalysisResult {
  const parsedJob = buildParsedJob(input.jobTitle, input.hireArea);
  const jobDescription = buildJobDescription(
    input.jobTitle,
    input.companyName,
    input.hireArea,
  );

  return {
    companyName: input.companyName,
    jobTitle: input.jobTitle,
    parsedJob,
    parsedResume: SAMPLE_RESUME,
    jobDescription,
    score: {
      qualificationScore: input.qualificationScore,
      confidenceScore: input.confidenceScore,
      careerFitAdjustment: 5,
      fitScore: input.fitScore,
      recommendation: input.recommendation,
      recommendationLabel: input.recommendationLabel,
      scoringMode: "registered",
      categoryBreakdown: [],
      opportunityCategories: buildOpportunityCategories(input.fitScore),
      unknownCategories: [],
      explanation: "Sample fit report for UI preview.",
      strengths: ["Strong alignment on core skills and tools."],
      gaps: ["Highlight recent portfolio case studies in your proposal."],
      positiveSignalsFound: ["saas", "product design"],
      negativeSignalsFound: [],
    },
    narrative: {
      strengths: ["Relevant product design experience."],
      gaps: ["Consider highlighting systems work."],
      recommendations: ["Tailor your proposal to the posting tone."],
      positiveSignals: ["B2B SaaS background matches the team."],
      negativeSignals: [],
    },
    postingContext: {
      employerType: "product_company",
      hireTarget: "freelancer",
      label: "Product company hiring a Freelancer",
      detail: null,
      engagementDuration: "ongoing",
      engagementPath: "contract",
      payStructure: "hourly",
      badges: ["Ongoing", "Contract", "Hourly"],
    },
  };
}
