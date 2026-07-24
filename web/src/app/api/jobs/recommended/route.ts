import { NextResponse } from "next/server";
import { loadRecommendedMuseJobs } from "@/lib/muse-jobs";

/** Capacitor static export: route stub only — live on Vercel/dev. */
export const dynamic = "force-static";
export const revalidate = 300;

/** Recommended product-design jobs from The Muse (page 0, Design and UX category). */
export async function GET() {
  try {
    const jobs = await loadRecommendedMuseJobs();
    console.log("[/api/jobs/recommended]", {
      status: 200,
      jobCount: jobs.length,
    });
    return NextResponse.json({ jobs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load recommended jobs.";
    console.error("[/api/jobs/recommended]", message);
    const status = /MUSE_API_KEY/i.test(message) ? 500 : 502;
    return NextResponse.json(
      {
        error:
          status === 500
            ? "Recommended jobs are not configured."
            : "Could not load recommended jobs.",
        jobs: [],
      },
      { status },
    );
  }
}
