-- Saved numbered Custom presets for Match Preferences (Custom 1, Custom 2, …).
-- JSON array: [{ id, label, weights: { skillsTools, experience, responsibilities, domainBackground } }]

alter table public.profiles
  add column if not exists match_score_custom_presets jsonb not null default '[]'::jsonb;

comment on column public.profiles.match_score_custom_presets is
  'Saved custom Fit Score weight presets (Custom 1, Custom 2, …). Active weights remain in match_score_weights.';

notify pgrst, 'reload schema';
