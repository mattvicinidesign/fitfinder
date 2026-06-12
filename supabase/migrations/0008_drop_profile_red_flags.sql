-- Remove unused onboarding red-flag preferences (feature removed).
alter table public.profiles
  drop column if exists red_flags;
