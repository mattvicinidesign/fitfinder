-- Minimum client star rating (0–5) from onboarding preferences.

alter table public.profiles
  add column if not exists preferred_minimum_employer_rating numeric;
