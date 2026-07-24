// Server-side AI rate limits. Quotas are enforced via the
// check_and_increment_ai_usage Postgres RPC (migration 0014).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { error } from "./cors.ts";

export type AiOperation =
  | "analyze"
  | "parse-resume"
  | "parse-job"
  | "review-resume"
  | "optimize-ats-keywords"
  | "export-optimized-resume"
  | "generate-proposal";

const WINDOW_SECONDS = 3600;

/** Hourly caps — guests are stricter to limit anonymous OpenAI burn. */
const LIMITS: Record<
  AiOperation,
  { guest: number; registered: number }
> = {
  analyze: { guest: 12, registered: 60 },
  "parse-resume": { guest: 15, registered: 80 },
  "parse-job": { guest: 20, registered: 100 },
  "review-resume": { guest: 10, registered: 50 },
  "optimize-ats-keywords": { guest: 10, registered: 40 },
  "export-optimized-resume": { guest: 10, registered: 40 },
  "generate-proposal": { guest: 8, registered: 40 },
};

export function limitForOperation(
  operation: AiOperation,
  isGuest: boolean,
): number {
  const row = LIMITS[operation];
  return isGuest ? row.guest : row.registered;
}

/**
 * Increment the caller's usage window. Throws a 429 Response when over quota.
 * If the RPC is missing (migration not applied), fail open with a warning log
 * so production deploys are not bricked — but log loudly.
 */
export async function enforceAiRateLimit(
  client: SupabaseClient,
  operation: AiOperation,
  isGuest: boolean,
): Promise<void> {
  const limit = limitForOperation(operation, isGuest);

  const { data, error: rpcError } = await client.rpc(
    "check_and_increment_ai_usage",
    {
      p_operation: operation,
      p_limit: limit,
      p_window_seconds: WINDOW_SECONDS,
    },
  );

  if (rpcError) {
    // Soft-allow only when migration 0014 has not been applied yet.
    if (/could not find|does not exist|PGRST202/i.test(rpcError.message)) {
      console.error(
        `[ai_rate_limit] Migration 0014 not applied — skipping limit for ${operation}`,
      );
      return;
    }
    console.error(
      `[ai_rate_limit] RPC failed for ${operation}:`,
      rpcError.message,
    );
    throw error("Service temporarily unavailable. Please try again.", 503);
  }

  if (data !== true) {
    throw error(
      "Too many requests. Please wait and try again later.",
      429,
    );
  }
}
