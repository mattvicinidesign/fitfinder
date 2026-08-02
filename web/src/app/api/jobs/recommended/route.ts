import { NextResponse } from "next/server";
import {
  loadDiverseRecentMuseJobs,
  loadTailoredMuseJobs,
} from "@/lib/muse-jobs";
import {
  buildRecommendedJobSignals,
  parseResumeJsonForSignals,
} from "@/lib/recommended-job-signals";
import { resolveRequestAuth } from "@/lib/supabase/request-client";

/**
 * Per-request personalization on Vercel/dev.
 * Capacitor static export uses a build-time stub (see prepare script); native
 * clients call the live Vercel origin instead of the bundled stub.
 */
export const dynamic = "force-dynamic";

export type RecommendedJobsMode = "tailored" | "diverse_recent";

async function resolveRecommendationMode(
  request: Request,
): Promise<{
  mode: RecommendedJobsMode;
  signals: ReturnType<typeof buildRecommendedJobSignals> | null;
}> {
  try {
    const { supabase, user } = await resolveRequestAuth(request);

    // Guests / anon: mixed recent jobs across random Muse categories.
    if (!user || user.is_anonymous) {
      return { mode: "diverse_recent", signals: null };
    }

    const { data: resumeRow } = await supabase
      .from("resumes")
      .select("parsed_resume_json")
      .eq("user_id", user.id)
      .not("parsed_resume_json", "is", null)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const parsed = parseResumeJsonForSignals(resumeRow?.parsed_resume_json);
    if (!parsed) {
      return { mode: "diverse_recent", signals: null };
    }

    return {
      mode: "tailored",
      signals: buildRecommendedJobSignals(parsed),
    };
  } catch {
    return { mode: "diverse_recent", signals: null };
  }
}

/** Recommended jobs from The Muse — tailored when a resume exists, else diverse recent. */
export async function GET(request: Request) {
  try {
    const { mode, signals } = await resolveRecommendationMode(request);

    const jobs =
      mode === "tailored" && signals
        ? await loadTailoredMuseJobs(signals)
        : await loadDiverseRecentMuseJobs();

    console.log("[/api/jobs/recommended]", {
      status: 200,
      mode,
      jobCount: jobs.length,
    });
    return NextResponse.json({ jobs, mode });
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
