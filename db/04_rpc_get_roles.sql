-- Function to get roles for specific users (bypassing RLS)
-- Needed for 'office' users to filter out 'owner' users from lists without giving full access to profiles table.

create or replace function public.get_profiles_roles(user_ids uuid[])
returns table (id uuid, role app_role)
language sql
security definer
set search_path = public
as $$
  select id, role 
  from public.profiles 
  where id = any(user_ids);
$$;

-- Grant access to authenticated users
grant execute on function public.get_profiles_roles to authenticated;
