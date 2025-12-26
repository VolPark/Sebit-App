-- 1. Create Enum for Roles (Idempotent)
do $$ begin
    create type app_role as enum ('owner', 'admin', 'office', 'reporter');
exception
    when duplicate_object then null;
end $$;

-- 2. Create Profiles Table (Idempotent)
create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  role app_role not null default 'reporter',
  full_name text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(full_name) >= 3)
);

-- 3. Enable RLS
alter table public.profiles enable row level security;

-- 4. Policies (Recreate to ensure latest version)

-- Drop existing policies to avoid conflicts
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins/Owners can view all profiles" on public.profiles;
drop policy if exists "Admins/Owners can update all profiles" on public.profiles;

-- Users can read their own profile.
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile.
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Helper function to check role without triggering RLS recursion
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin')
  );
end;
$$ language plpgsql security definer;

-- Admins/Owners can read all profiles.
create policy "Admins/Owners can view all profiles" on public.profiles
  for select using ( public.is_admin() );

-- Admins/Owners can update all profiles (to change roles).
create policy "Admins/Owners can update all profiles" on public.profiles
  for update using ( public.is_admin() );


-- 5. Trigger to create Profile on Signup
-- This ensures every new user gets a 'reporter' role by default.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'reporter')
  on conflict (id) do nothing; -- Handle existing profiles
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger first to ensure clean recreation
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Grant Permissions (Safe Default)
grant usage on schema public to anon, authenticated;
grant all on public.profiles to postgres, service_role;
grant select, update on public.profiles to authenticated;
