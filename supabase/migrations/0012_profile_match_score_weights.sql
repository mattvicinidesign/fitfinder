-- User-configurable Fit Score category weights (semantic match engine).
-- JSON shape: { skillsTools, experience, responsibilities, domainBackground }
-- Must sum to 100. Null means use platform defaults (Balanced).

alter table public.profiles
  add column if not exists match_score_weights jsonb;

comment on column public.profiles.match_score_weights is
  'Optional per-user Fit Score category weights (skillsTools, experience, responsibilities, domainBackground). Null = Balanced defaults.';

notify pgrst, 'reload schema';
