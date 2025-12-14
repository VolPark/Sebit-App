-- Disable RLS on fixed_costs to match the rest of the application schema
-- (Existing tables do not have RLS enabled, so inserting with default organization_id 0000... fails strict RLS checks if user is not explicitly a member)

ALTER TABLE public.fixed_costs DISABLE ROW LEVEL SECURITY;
