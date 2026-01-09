-- Trigger to create Profile on Signup
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

-- 7. Backfill existing users (Safe to run, handles duplicates)
insert into public.profiles (id, full_name, role)
select id, raw_user_meta_data->>'full_name', 'reporter'
from auth.users
on conflict (id) do nothing;
