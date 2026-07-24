-- P1: Prevent clients from escalating account_type (or spoofing id).
-- P2: Durable AI usage counters for server-side rate limits.

-- ---------------------------------------------------------------------------
-- Lock protected columns on public.users
-- ---------------------------------------------------------------------------

-- Auth sync (handle_user_update) may change account_type when anonymous users
-- convert to registered. Direct client UPDATEs must not.
create or replace function public.prevent_users_protected_column_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'users.id is immutable';
  end if;
  if new.account_type is distinct from old.account_type
     and coalesce(current_setting('app.allow_account_type_sync', true), '') <> 'on'
  then
    raise exception 'users.account_type is managed by auth and cannot be updated directly';
  end if;
  return new;
end;
$$;

drop trigger if exists users_protect_columns on public.users;
create trigger users_protect_columns
  before update on public.users
  for each row
  execute function public.prevent_users_protected_column_updates();

create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_account_type_sync', 'on', true);
  update public.users
  set email = new.email,
      account_type = case when new.is_anonymous then 'guest'::account_type else 'registered'::account_type end
  where id = new.id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- AI usage rate-limit ledger
-- ---------------------------------------------------------------------------

create table if not exists public.ai_usage_windows (
  user_id uuid not null references auth.users (id) on delete cascade,
  operation text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, operation, window_start)
);

create index if not exists ai_usage_windows_user_window_idx
  on public.ai_usage_windows (user_id, window_start desc);

alter table public.ai_usage_windows enable row level security;

-- No direct client access — only the security-definer RPC below.
revoke all on table public.ai_usage_windows from anon, authenticated;
grant select, insert, update on table public.ai_usage_windows to service_role;

/**
 * Atomically check + increment usage for the caller's auth.uid().
 * Returns whether the request is allowed (true) or over quota (false).
 */
create or replace function public.check_and_increment_ai_usage(
  p_operation text,
  p_limit integer,
  p_window_seconds integer default 3600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_window_start timestamptz;
  v_count integer;
begin
  if v_user_id is null then
    return false;
  end if;

  if p_operation is null or length(trim(p_operation)) = 0 then
    raise exception 'operation is required';
  end if;

  if p_limit is null or p_limit < 1 then
    raise exception 'limit must be >= 1';
  end if;

  if p_window_seconds is null or p_window_seconds < 60 then
    p_window_seconds := 3600;
  end if;

  -- Align to fixed buckets so concurrent requests share one counter.
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.ai_usage_windows as u (user_id, operation, window_start, request_count)
  values (v_user_id, trim(p_operation), v_window_start, 1)
  on conflict (user_id, operation, window_start)
  do update
    set request_count = u.request_count + 1
  where u.request_count < p_limit
  returning u.request_count into v_count;

  if v_count is null then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.check_and_increment_ai_usage(text, integer, integer) from public;
grant execute on function public.check_and_increment_ai_usage(text, integer, integer) to authenticated;
grant execute on function public.check_and_increment_ai_usage(text, integer, integer) to service_role;

-- Guests may not write Preferences weight columns (UI is locked; enforce in DB).
create or replace function public.prevent_guest_match_score_weight_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_guest boolean := false;
begin
  if new.match_score_weights is not distinct from old.match_score_weights
     and coalesce(new.match_score_custom_presets, '[]'::jsonb)
        is not distinct from coalesce(old.match_score_custom_presets, '[]'::jsonb)
  then
    return new;
  end if;

  select coalesce(u.account_type = 'guest', false)
    or coalesce(au.is_anonymous, false)
  into v_is_guest
  from auth.users au
  left join public.users u on u.id = au.id
  where au.id = auth.uid();

  if coalesce(v_is_guest, false) then
    raise exception 'Guests cannot update match score preferences';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guest_weight_guard on public.profiles;
create trigger profiles_guest_weight_guard
  before update on public.profiles
  for each row
  execute function public.prevent_guest_match_score_weight_updates();
