-- Onboarding intent fields for personalization / analytics only.
-- These do NOT feed the job-fit matching algorithm (resume + job description only).

alter table public.profiles
  add column if not exists job_search_goals text[] not null default '{}',
  add column if not exists search_stage text,
  add column if not exists help_topics text[] not null default '{}';

notify pgrst, 'reload schema';
