-- Display name and professional title for General Info on the profile screen.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists professional_title text;

notify pgrst, 'reload schema';
