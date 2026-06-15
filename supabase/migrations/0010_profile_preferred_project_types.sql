-- Onboarding preference: ongoing vs one-time project type.

alter table public.profiles
  add column if not exists preferred_project_types text[] not null default '{}';

notify pgrst, 'reload schema';
