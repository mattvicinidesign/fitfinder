import type { ResumeReviewCategoryKey } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Columns3,
  FileSearch,
  GraduationCap,
  Lightbulb,
  Target,
  UserRound,
  Palette,
  ScanLine,
} from "lucide-react";

export type ResumeReviewResource = {
  id: string;
  title: string;
  description: string;
  url: string;
  cta: string;
  categoryKey: ResumeReviewCategoryKey;
  icon: LucideIcon;
  /** Tailwind gradient classes for the card background. */
  gradientClass: string;
};

export const RESUME_REVIEW_RESOURCES: ResumeReviewResource[] = [
  {
    id: "harvard-resume",
    title: "Harvard Resume Guide",
    description:
      "How to write bullet points with action verbs, scope, and quantified impact.",
    url: "https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/",
    cta: "Read guide",
    categoryKey: "content",
    icon: GraduationCap,
    gradientClass: "bg-gradient-to-br from-[#1e3a5f] to-[#0c1929]",
  },
  {
    id: "indeed-quantify-resume",
    title: "Quantify Your Resume",
    description:
      "Turn responsibilities into metrics — users, revenue, time saved, and % improvements.",
    url: "https://www.indeed.com/career-advice/resumes-cover-letters/how-to-quantify-resume",
    cta: "Read guide",
    categoryKey: "content",
    icon: BarChart3,
    gradientClass: "bg-gradient-to-br from-violet-600 to-[#3b0764]",
  },
  {
    id: "purdue-owl-achievements",
    title: "Purdue OWL Achievement Bullets",
    description:
      "Structure each bullet around results and measurable outcomes in work experience.",
    url: "https://owl.purdue.edu/owl/job_search_writing/resumes_and_vitas/resume_sections/work_experience_section.html",
    cta: "Read guide",
    categoryKey: "content",
    icon: BookOpen,
    gradientClass: "bg-gradient-to-br from-emerald-700 to-[#064e3b]",
  },
  {
    id: "indeed-xyz-formula",
    title: "XYZ Bullet Formula",
    description:
      "Accomplished X, measured by Y, by doing Z — a simple framework for metric bullets.",
    url: "https://simplify.jobs/blog/how-to-use-the-xyz-resume-format",
    cta: "Read guide",
    categoryKey: "content",
    icon: Target,
    gradientClass: "bg-gradient-to-br from-amber-600 to-[#78350f]",
  },
  {
    id: "muse-quantify-estimates",
    title: "Quantify Without Exact Numbers",
    description:
      "Estimate scope, frequency, and impact when you do not have hard revenue or user stats.",
    url: "https://www.themuse.com/advice/how-to-quantify-your-resume-bullets-when-you-dont-work-with-numbers",
    cta: "Read guide",
    categoryKey: "content",
    icon: Lightbulb,
    gradientClass: "bg-gradient-to-br from-fuchsia-600 to-[#701a75]",
  },
  {
    id: "canva-templates",
    title: "Canva Resume Templates",
    description: "Simple layouts that stay readable on screen and in print.",
    url: "https://www.canva.com/resumes/templates/",
    cta: "Browse templates",
    categoryKey: "structure",
    icon: Palette,
    gradientClass: "bg-gradient-to-br from-cyan-600 to-[#155e75]",
  },
  {
    id: "indeed-format",
    title: "Indeed Resume Format Guide",
    description: "Section order, spacing, and hierarchy that recruiters scan fast.",
    url: "https://www.indeed.com/career-advice/resumes-cover-letters/resume-format-guide-with-examples",
    cta: "Read guide",
    categoryKey: "structure",
    icon: Columns3,
    gradientClass: "bg-gradient-to-br from-sky-600 to-[#1e3a8a]",
  },
  {
    id: "jobscan",
    title: "Jobscan ATS Scanner",
    description: "See how applicant tracking systems read your resume.",
    url: "https://www.jobscan.co/resume-scanner",
    cta: "Scan resume",
    categoryKey: "ats",
    icon: ScanLine,
    gradientClass: "bg-gradient-to-br from-orange-600 to-[#7c2d12]",
  },
  {
    id: "novoresume-ats",
    title: "Novoresume ATS Tips",
    description: "Formatting rules and keyword placement for ATS-friendly resumes.",
    url: "https://novoresume.com/career-blog/resume-ats",
    cta: "Read tips",
    categoryKey: "ats",
    icon: FileSearch,
    gradientClass: "bg-gradient-to-br from-rose-600 to-[#881337]",
  },
  {
    id: "linkedin-profile",
    title: "LinkedIn Profile Tips",
    description: "Align your profile with what recruiters expect to find.",
    url: "https://www.linkedin.com/help/linkedin/answer/a1339360",
    cta: "View tips",
    categoryKey: "completeness",
    icon: UserRound,
    gradientClass: "bg-gradient-to-br from-[#0077b5] to-[#004182]",
  },
  {
    id: "mit-checklist",
    title: "MIT Resume Checklist",
    description: "Contact info, education, skills, and links every resume needs.",
    url: "https://capd.mit.edu/resources/resume-checklist/",
    cta: "View checklist",
    categoryKey: "completeness",
    icon: ClipboardCheck,
    gradientClass: "bg-gradient-to-br from-red-700 to-[#450a0a]",
  },
];

export function getResumeReviewResourcesForCategory(
  categoryKey: ResumeReviewCategoryKey,
): ResumeReviewResource[] {
  return RESUME_REVIEW_RESOURCES.filter(
    (resource) => resource.categoryKey === categoryKey,
  );
}
