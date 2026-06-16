"use client";

import type { ProposalGeneration, ProposalSections } from "@/lib/types";
import { capRelevantProjects, splitIntroductionParagraphs } from "@/lib/proposal-format";
import { formatPortfolioDisplayUrl } from "@/lib/portfolio-url";
import { cn } from "@/lib/utils";

function SectionHeading({
  emoji,
  title,
  className,
}: {
  emoji: string;
  title: string;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-[15px] font-semibold leading-snug text-foreground",
        className,
      )}
    >
      <span aria-hidden className="mr-1.5">
        {emoji}
      </span>
      {title}
    </h3>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5 pl-0.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-2 text-[14px] leading-snug text-foreground/90"
        >
          <span
            aria-hidden
            className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-primary/70"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PortfolioLine({ url }: { url: string }) {
  return (
    <p className="text-[14px] leading-snug text-foreground">
      <span aria-hidden className="mr-1">🔗</span>
      <span className="font-medium">Portfolio:</span>{" "}
      <a
        href={portfolioHref(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-amber-400 underline underline-offset-2 hover:text-amber-300"
      >
        {formatPortfolioDisplayUrl(url)}
      </a>
    </p>
  );
}

function IntroBlock({
  text,
  portfolioUrl,
}: {
  text: string;
  portfolioUrl?: string | null;
}) {
  const paragraphs = splitIntroductionParagraphs(text);
  if (paragraphs.length === 0) {
    return portfolioUrl ? <PortfolioLine url={portfolioUrl} /> : null;
  }
  return (
    <div className="space-y-2.5">
      <p className="text-[14px] leading-relaxed text-foreground/90">
        {paragraphs[0]}
      </p>
      {portfolioUrl ? <PortfolioLine url={portfolioUrl} /> : null}
      {paragraphs.slice(1).map((p) => (
        <p key={p} className="text-[14px] leading-relaxed text-foreground/90">
          {p}
        </p>
      ))}
    </div>
  );
}

function ProjectBlock({
  project,
}: {
  project: ProposalSections["relevantProjects"][number];
}) {
  return (
    <div className="space-y-2.5">
      <h4 className="text-[15px] font-semibold leading-snug text-foreground">
        {project.name}
      </h4>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Why It&apos;s Relevant
        </p>
        <p className="mt-1 text-[14px] leading-snug text-foreground/90">
          {project.whyRelevant}
        </p>
      </div>
      {project.keyContributions.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Key Contributions
          </p>
          <div className="mt-1.5">
            <BulletList items={project.keyContributions} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function portfolioHref(url: string): string {
  return url.startsWith("http") ? url : `http://${url}`;
}

/** Premium scannable proposal layout with clear section hierarchy. */
export function ProposalStructuredView({
  proposal,
  className,
}: {
  proposal: ProposalGeneration;
  className?: string;
}) {
  const sections = proposal.sections;
  if (!sections) return null;

  const projects = capRelevantProjects(sections.relevantProjects);
  const portfolioUrl = sections.portfolioUrl;

  return (
    <div className={cn("space-y-6", className)}>
      <header className="space-y-3">
        <h3 className="text-[18px] font-semibold leading-snug text-foreground">
          Hi There 👋
        </h3>
        <IntroBlock text={sections.introduction} portfolioUrl={portfolioUrl} />
      </header>

      {projects.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading emoji="🚀" title="Relevant Projects" />
          <div className="space-y-6">
            {projects.map((project) => (
              <ProjectBlock key={project.name} project={project} />
            ))}
          </div>
        </section>
      ) : null}

      {sections.coreExpertise.length > 0 ? (
        <section className="space-y-2.5">
          <SectionHeading emoji="💎" title="Core Expertise" />
          <BulletList items={sections.coreExpertise} />
        </section>
      ) : null}

      {sections.howIWork.length > 0 ? (
        <section className="space-y-2.5">
          <SectionHeading emoji="⚙️" title="How I Work" />
          <BulletList items={sections.howIWork} />
        </section>
      ) : null}

      {sections.whatIDeliver.length > 0 ? (
        <section className="space-y-2.5">
          <SectionHeading emoji="📦" title="What I Deliver" />
          <BulletList items={sections.whatIDeliver} />
        </section>
      ) : null}

      <section className="space-y-2.5 border-t border-border/50 pt-5">
        <SectionHeading emoji="🤝" title="Closing" />
        <IntroBlock text={sections.closing} />
      </section>
    </div>
  );
}
