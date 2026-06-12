-- Fit Finder — idempotent hosted bootstrap
-- Run once in Supabase Dashboard → SQL Editor (Primary Database, postgres role).
-- Safe if storage policies already exist; creates missing tables (e.g. public.resumes).

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type account_type as enum ('guest', 'registered');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type saved_job_status as enum (
    'saved', 'applied', 'interviewing', 'offer', 'rejected', 'archived'
  );
exception when duplicate_object then null;
end $$;

-- Tables
create table if not exists public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  account_type account_type not null default 'guest',
  created_at   timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id                uuid primary key references public.users (id) on delete cascade,
  country                text,
  timezone               text,
  desired_compensation   numeric,
  desired_compensation_min numeric,
  desired_compensation_max numeric,
  desired_compensation_currency text default 'USD',
  desired_compensation_period text,
  work_authorization     text,
  qualified_industries   text[] not null default '{}',
  qualified_skills       text[] not null default '{}',
  preferred_engagement_types text[] not null default '{}',
  preferred_regions          text[] not null default '{}',
  preferred_company_types    text[] not null default '{}',
  onboarding_completed_at    timestamptz,
  full_name                  text,
  professional_title         text,
  updated_at             timestamptz not null default now()
);

-- Onboarding preference columns (idempotent for existing installs)
alter table public.profiles
  add column if not exists preferred_engagement_types text[] not null default '{}',
  add column if not exists preferred_regions text[] not null default '{}',
  add column if not exists preferred_company_types text[] not null default '{}',
  add column if not exists onboarding_completed_at timestamptz;

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists professional_title text;

create table if not exists public.resumes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users (id) on delete cascade,
  file_url           text,
  parsed_resume_json jsonb,
  uploaded_at        timestamptz not null default now()
);

create table if not exists public.analyses (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users (id) on delete cascade,
  resume_id             uuid references public.resumes (id) on delete set null,
  company_name          text,
  job_title             text,
  job_description       text,
  parsed_job_json       jsonb,
  qualification_score   numeric,
  fit_score             numeric,
  confidence_score      numeric,
  career_fit_adjustment numeric,
  recommendation        text,
  recommendation_label  text,
  narrative_json        jsonb,
  created_at            timestamptz not null default now()
);

create table if not exists public.saved_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  status      saved_job_status not null default 'saved',
  created_at  timestamptz not null default now(),
  unique (user_id, analysis_id)
);

create table if not exists public.comparisons (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  analysis_a_id uuid not null references public.analyses (id) on delete cascade,
  analysis_b_id uuid not null references public.analyses (id) on delete cascade,
  created_at    timestamptz not null default now(),
  check (analysis_a_id <> analysis_b_id)
);

create index if not exists resumes_user_id_idx on public.resumes (user_id);
create index if not exists analyses_user_id_idx on public.analyses (user_id);
create index if not exists saved_jobs_user_id_idx on public.saved_jobs (user_id);
create index if not exists comparisons_user_id_idx on public.comparisons (user_id);

-- Auth triggers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, account_type)
  values (
    new.id,
    new.email,
    case when new.is_anonymous then 'guest'::account_type else 'registered'::account_type end
  )
  on conflict (id) do nothing;

  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set email = new.email,
      account_type = case
        when new.is_anonymous then 'guest'::account_type
        else 'registered'::account_type
      end
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_update();

-- Backfill existing auth users (guests who signed in before this script)
insert into public.users (id, email, account_type)
select id, email,
  case when is_anonymous then 'guest'::account_type else 'registered'::account_type end
from auth.users
on conflict (id) do nothing;

insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- RLS
alter table public.users       enable row level security;
alter table public.profiles    enable row level security;
alter table public.resumes     enable row level security;
alter table public.analyses    enable row level security;
alter table public.saved_jobs  enable row level security;
alter table public.comparisons enable row level security;

drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_update_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "resumes_all_own" on public.resumes;
drop policy if exists "analyses_all_own" on public.analyses;
drop policy if exists "saved_jobs_all_own" on public.saved_jobs;
drop policy if exists "comparisons_all_own" on public.comparisons;
create policy "resumes_all_own" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "analyses_all_own" on public.analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saved_jobs_all_own" on public.saved_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comparisons_all_own" on public.comparisons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "resumes_storage_select_own" on storage.objects;
drop policy if exists "resumes_storage_insert_own" on storage.objects;
drop policy if exists "resumes_storage_update_own" on storage.objects;
drop policy if exists "resumes_storage_delete_own" on storage.objects;

create policy "resumes_storage_select_own" on storage.objects
  for select using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resumes_storage_insert_own" on storage.objects
  for insert with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resumes_storage_update_own" on storage.objects
  for update using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resumes_storage_delete_own" on storage.objects
  for delete using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

-- V1: canonical recommendation label from scoring engine
alter table public.analyses
  add column if not exists recommendation_label text;

update public.analyses
set recommendation_label = case recommendation
  when 'strong_apply' then 'Highly Recommended'
  when 'apply' then 'Recommended'
  when 'stretch' then 'Somewhat Recommended'
  when 'not_recommended' then 'Low Alignment'
  else recommendation_label
end
where recommendation_label is null and recommendation is not null;

-- Notify PostgREST to reload schema (fixes "schema cache" errors)
notify pgrst, 'reload schema';
