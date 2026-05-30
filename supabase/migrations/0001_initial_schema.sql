-- Fit Finder — initial schema
-- Mirrors auth.users into public.users and adds the product tables.
-- Row Level Security is enabled on every table; users can only ever touch
-- their own rows. Guest Mode uses Supabase anonymous sign-in, which still
-- produces a real auth.users row, so the same auth.uid() policies apply.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type account_type as enum ('guest', 'registered');
create type saved_job_status as enum ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'archived');

-- ---------------------------------------------------------------------------
-- users — application mirror of auth.users
-- ---------------------------------------------------------------------------
create table public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  account_type account_type not null default 'guest',
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id              uuid primary key references public.users (id) on delete cascade,
  country              text,
  timezone             text,
  desired_compensation numeric,
  work_authorization   text,
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- resumes
-- ---------------------------------------------------------------------------
create table public.resumes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users (id) on delete cascade,
  file_url           text,
  parsed_resume_json jsonb,
  uploaded_at        timestamptz not null default now()
);
create index resumes_user_id_idx on public.resumes (user_id);

-- ---------------------------------------------------------------------------
-- analyses
-- ---------------------------------------------------------------------------
create table public.analyses (
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
  narrative_json        jsonb,
  created_at            timestamptz not null default now()
);
create index analyses_user_id_idx on public.analyses (user_id);

-- ---------------------------------------------------------------------------
-- saved_jobs
-- ---------------------------------------------------------------------------
create table public.saved_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  status      saved_job_status not null default 'saved',
  created_at  timestamptz not null default now(),
  unique (user_id, analysis_id)
);
create index saved_jobs_user_id_idx on public.saved_jobs (user_id);

-- ---------------------------------------------------------------------------
-- comparisons
-- ---------------------------------------------------------------------------
create table public.comparisons (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  analysis_a_id uuid not null references public.analyses (id) on delete cascade,
  analysis_b_id uuid not null references public.analyses (id) on delete cascade,
  created_at    timestamptz not null default now(),
  check (analysis_a_id <> analysis_b_id)
);
create index comparisons_user_id_idx on public.comparisons (user_id);

-- ---------------------------------------------------------------------------
-- Auto-provision public.users + profiles on auth signup.
-- ---------------------------------------------------------------------------
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep account_type in sync if an anonymous user later converts to registered.
create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set email = new.email,
      account_type = case when new.is_anonymous then 'guest'::account_type else 'registered'::account_type end
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_update();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users       enable row level security;
alter table public.profiles    enable row level security;
alter table public.resumes     enable row level security;
alter table public.analyses    enable row level security;
alter table public.saved_jobs  enable row level security;
alter table public.comparisons enable row level security;

-- users: a user may read/update only their own row. Inserts happen via trigger.
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- profiles
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A reusable "owns the row" pattern for the remaining tables.
create policy "resumes_all_own" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "analyses_all_own" on public.analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "saved_jobs_all_own" on public.saved_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "comparisons_all_own" on public.comparisons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for resume files (private; RLS by owning folder = user id).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "resumes_storage_select_own" on storage.objects
  for select using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resumes_storage_insert_own" on storage.objects
  for insert with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resumes_storage_update_own" on storage.objects
  for update using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resumes_storage_delete_own" on storage.objects
  for delete using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
