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
    <div className="min-h-dvh flex flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4 md:px-8">
        <span className="font-semibold tracking-tight">Fit Finder</span>
        <div className="flex gap-2">
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Sign in
          </Link>
          <Link href="/analyze" className={buttonVariants({ size: "sm" })}>
            Open app
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-16 md:py-24">
        <section className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            AI job-fit analysis
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Know if you fit the job
            <br />
            before you apply.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground">
            One app for web and iOS. Upload a resume, analyze any role, and get
            the same scores everywhere — powered by a single UI and shared
            backend.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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

        <section className="mt-20 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border p-6">
              <h2 className="font-medium">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
