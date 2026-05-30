-- Profile-level industries you are qualified in (used for scoring only, not shown on resume).

alter table public.profiles
  add column if not exists qualified_industries text[] not null default '{}';
