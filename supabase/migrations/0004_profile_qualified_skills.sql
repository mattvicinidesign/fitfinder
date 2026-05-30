-- Profile-level skills for Skills category scoring (not shown on resume).

alter table public.profiles
  add column if not exists qualified_skills text[] not null default '{}';
