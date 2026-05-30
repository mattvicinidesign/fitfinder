import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Qualification score",
    body: "Weighted coverage of the role's required skills, tools, and AI requirements.",
  },
  {
    title: "Confidence score",
    body: "How much real signal your resume and the posting actually provided.",
  },
  {
    title: "Career-fit adjustment",
    body: "Industry and archetype alignment nudges the score up or down.",
  },
  {
    title: "Narrative analysis",
    body: "Plain-language strengths, gaps, and recommendations you can act on.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4">
      <section className="py-24 text-center sm:py-32">
        <p className="text-sm font-medium text-muted-foreground">
          AI job-fit analysis
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Know if you fit the job
          <br />
          before you apply.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground">
          Fit Finder reads your resume and any job description, then scores your
          fit and tells you exactly where you&apos;re strong and where you fall
          short.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/analyze" className={buttonVariants({ size: "lg" })}>
            Analyze a job
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-24 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border p-6">
            <h2 className="font-medium">{f.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
