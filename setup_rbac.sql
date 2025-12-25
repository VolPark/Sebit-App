-- 1. Create Enum for Roles
create type app_role as enum ('owner', 'admin', 'office', 'reporter');

-- 2. Create Profiles Table
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  role app_role not null default 'reporter',
  full_name text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(full_name) >= 3)
);

-- 3. Enable RLS
alter table public.profiles enable row level security;

-- 4. Policies
-- Public read access to profiles? No, strict.
-- Users can read their own profile.
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile.
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Admins/Owners can read all profiles.
-- But wait, we need a way to check if current user is admin without recursion if we store role in profile.
-- Standard pattern: Use a secure metadata or just allow global read for authorized staff?
-- Let's make it simple: 'owner' and 'admin' can read all profiles.
create policy "Admins/Owners can view all profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Admins/Owners can update all profiles (to change roles).
create policy "Admins/Owners can update all profiles" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );


-- 5. Trigger to create Profile on Signup
-- This ensures every new user gets a 'reporter' role by default.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'reporter');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Grant Permissions (Safe Default)
grant usage on schema public to anon, authenticated;
grant all on public.profiles to postgres, service_role;
grant select, update on public.profiles to authenticated;
