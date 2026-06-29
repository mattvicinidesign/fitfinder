import { Check } from "lucide-react";
import { ResumeScoreIntroIllustration } from "@/components/resume-score-intro-illustration";

const INTRO_BULLETS = [
  "Score ATS compatibility and keyword fit",
  "Review content, structure & completeness",
  "See category breakdowns and next steps",
  "Optimize keywords and export your resume",
] as const;

export function ResumeReviewIntro() {
  return (
    <section
      className="mx-auto flex w-full max-w-sm flex-col items-center overflow-visible pt-6"
      aria-label="What Score includes"
    >
      <h2 className="mb-4 text-center text-[22px] font-semibold tracking-tight text-foreground">
        See How Your Resume Performs
      </h2>
      <div className="relative flex w-full justify-center overflow-visible pb-2 pt-2">
        <div className="relative h-[13.75rem] w-[20rem] overflow-visible">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[18rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(4,117,239,0.34)_0%,rgba(4,117,239,0.1)_38%,transparent_68%)]"
          />
          <ResumeScoreIntroIllustration className="relative z-10 h-full w-full" />
        </div>
      </div>
      <ul className="w-full space-y-2.5 py-6">
        {INTRO_BULLETS.map((text) => (
          <li
            key={text}
            className="flex items-center gap-2.5 text-[14px] leading-none text-foreground/90"
          >
            <Check
              className="size-4 shrink-0 text-emerald-400"
              strokeWidth={2.5}
              aria-hidden
            />
            <span className="whitespace-nowrap">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
