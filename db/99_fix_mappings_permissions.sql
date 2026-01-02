
-- Ensure RLS is on
ALTER TABLE public.accounting_mappings ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to be safe
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.accounting_mappings;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.accounting_mappings;

-- Re-create simple policy
CREATE POLICY "Allow read access for authenticated users" ON public.accounting_mappings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for authenticated users" ON public.accounting_mappings
    FOR ALL TO authenticated USING (true);

-- Explicitly grant select
GRANT SELECT ON public.accounting_mappings TO authenticated;
GRANT SELECT ON public.accounting_mappings TO service_role;
GRANT ALL ON public.accounting_mappings TO postgres;
