import type { ResumeReviewCategoryKey } from "@/lib/types";

export type ResumeReviewResource = {
  id: string;
  title: string;
  description: string;
  url: string;
  cta: string;
  categoryKey: ResumeReviewCategoryKey;
};

export const RESUME_REVIEW_RESOURCES: ResumeReviewResource[] = [
  {
    id: "harvard-resume",
    title: "Harvard Resume Guide",
    description: "Strong bullet points, action verbs, and impact metrics.",
    url: "https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/",
    cta: "Read guide",
    categoryKey: "content",
  },
  {
    id: "resume-worded",
    title: "Resume Worded",
    description: "Free feedback on wording, keywords, and overall impact.",
    url: "https://resumeworded.com/",
    cta: "Get feedback",
    categoryKey: "content",
  },
  {
    id: "purdue-owl-resume",
    title: "Purdue OWL Resume Writing",
    description: "Clear guidance on summaries, skills, and achievement bullets.",
    url: "https://owl.purdue.edu/owl/job_search_writing/resumes_and_vitae/index.html",
    cta: "Read guide",
    categoryKey: "content",
  },
  {
    id: "canva-templates",
    title: "Canva Resume Templates",
    description: "Simple layouts that stay readable on screen and in print.",
    url: "https://www.canva.com/resumes/templates/",
    cta: "Browse templates",
    categoryKey: "structure",
  },
  {
    id: "indeed-format",
    title: "Indeed Resume Format Guide",
    description: "Section order, spacing, and hierarchy that recruiters scan fast.",
    url: "https://www.indeed.com/career-advice/resumes-cover-letters/resume-format-guide",
    cta: "Read guide",
    categoryKey: "structure",
  },
  {
    id: "jobscan",
    title: "Jobscan ATS Scanner",
    description: "See how applicant tracking systems read your resume.",
    url: "https://www.jobscan.co/resume-scanner",
    cta: "Scan resume",
    categoryKey: "ats",
  },
  {
    id: "novoresume-ats",
    title: "Novoresume ATS Tips",
    description: "Formatting rules and keyword placement for ATS-friendly resumes.",
    url: "https://novoresume.com/career-blog/resume-ats",
    cta: "Read tips",
    categoryKey: "ats",
  },
  {
    id: "linkedin-profile",
    title: "LinkedIn Profile Tips",
    description: "Align your profile with what recruiters expect to find.",
    url: "https://www.linkedin.com/help/linkedin/answer/a1339360",
    cta: "View tips",
    categoryKey: "completeness",
  },
  {
    id: "mit-checklist",
    title: "MIT Resume Checklist",
    description: "Contact info, education, skills, and links every resume needs.",
    url: "https://capd.mit.edu/resources/resume-checklist/",
    cta: "View checklist",
    categoryKey: "completeness",
  },
];

export function getResumeReviewResourcesForCategory(
  categoryKey: ResumeReviewCategoryKey,
): ResumeReviewResource[] {
  return RESUME_REVIEW_RESOURCES.filter(
    (resource) => resource.categoryKey === categoryKey,
  );
}
