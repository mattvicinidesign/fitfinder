-- Onboarding-style desired pay range (e.g. $35–60/hr). Legacy desired_compensation kept for single annual fallback.

alter table public.profiles
  add column if not exists desired_compensation_min numeric,
  add column if not exists desired_compensation_max numeric,
  add column if not exists desired_compensation_currency text default 'USD',
  add column if not exists desired_compensation_period text;
