-- Fix RLS policies for 'pracovnici' table to allow deletion

-- 1. Enable RLS (just in case it's not enabled, though usually it is if issues arise)
ALTER TABLE public.pracovnici ENABLE ROW LEVEL SECURITY;

-- 2. Create policy to allow DELETE for authenticated users
--    Check if policy exists first to avoid error, or just drop and recreate.
--    Simple approach: Create a permissive policy for delete.

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.pracovnici;

CREATE POLICY "Enable delete for authenticated users"
ON public.pracovnici
FOR DELETE
TO authenticated
USING (true);

-- 3. Also ensure other operations are permitted (optional, but good practice if RLS is on)
--    If RLS is on, you need policies for SELECT, INSERT, UPDATE too.

DROP POLICY IF EXISTS "Enable read access for all users" ON public.pracovnici;
CREATE POLICY "Enable read access for all users"
ON public.pracovnici
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.pracovnici;
CREATE POLICY "Enable insert for authenticated users"
ON public.pracovnici
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.pracovnici;
CREATE POLICY "Enable update for authenticated users"
ON public.pracovnici
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
