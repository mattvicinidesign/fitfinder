import { createClient } from "@/lib/supabase/client";
import { compensationFromProfileRow } from "@/lib/profile-desired-compensation";
import type { Compensation } from "@/lib/types";

const PROFILE_COMP_SELECT =
  "desired_compensation, desired_compensation_min, desired_compensation_max, desired_compensation_currency, desired_compensation_period";

/** Desired pay from Profile (hourly range, annual, etc.). */
export async function fetchProfileDesiredCompensation(): Promise<Compensation | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COMP_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  return compensationFromProfileRow(data ?? undefined);
}

/** @deprecated Prefer fetchProfileDesiredCompensation */
export async function fetchProfileDesiredAnnual(): Promise<number | null> {
  const comp = await fetchProfileDesiredCompensation();
  if (!comp) return null;
  const base =
    comp.min != null && comp.max != null
      ? (comp.min + comp.max) / 2
      : (comp.max ?? comp.min);
  if (base == null) return null;
  if (comp.period === "hour") return base * 2080;
  if (comp.period === "month") return base * 12;
  return base;
}

/** Profile industries used for scoring (not shown on resume UI). */
export async function fetchProfileQualifiedIndustries(): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("profiles")
    .select("qualified_industries")
    .eq("user_id", user.id)
    .maybeSingle();

  return Array.isArray(data?.qualified_industries)
    ? data.qualified_industries.filter((x): x is string => typeof x === "string")
    : [];
}

/** Profile skills used for Skills scoring (not shown on resume UI). */
export async function fetchProfileQualifiedSkills(): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("profiles")
    .select("qualified_skills")
    .eq("user_id", user.id)
    .maybeSingle();

  return Array.isArray(data?.qualified_skills)
    ? data.qualified_skills.filter((x): x is string => typeof x === "string")
    : [];
}

/** Profile country used when resume parse omits country. */
export async function fetchProfileCountry(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("country")
    .eq("user_id", user.id)
    .maybeSingle();

  const c = data?.country;
  return typeof c === "string" && c.trim() ? c.trim() : null;
}

/** Profile timezone used when resume parse omits timezone. */
export async function fetchProfileTimezone(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  const tz = data?.timezone;
  return typeof tz === "string" && tz.trim() ? tz.trim() : null;
}
