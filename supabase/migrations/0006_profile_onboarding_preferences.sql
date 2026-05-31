-- Lightweight onboarding PREFERENCE fields. Additive only — these provide extra
-- matching signals and never change the existing recommendation weights.
-- Onboarding only stores what a resume cannot provide; minimum hourly rate
-- reuses desired_compensation_min (period = 'hour').

alter table public.profiles
  add column if not exists preferred_engagement_types text[] not null default '{}',
  add column if not exists preferred_regions text[] not null default '{}',
  add column if not exists preferred_company_types text[] not null default '{}',
  add column if not exists red_flags text[] not null default '{}',
  add column if not exists onboarding_completed_at timestamptz;

notify pgrst, 'reload schema';
