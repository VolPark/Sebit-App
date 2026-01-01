-- Enable RLS on new tables
ALTER TABLE public.accounting_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_sync_logs ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users (or specific roles if needed)
-- For now, allow authenticated users to view all accounting data (internal app)

-- 1. Providers
CREATE POLICY "Allow read access for authenticated users" ON public.accounting_providers
    FOR SELECT TO authenticated USING (true);
    
-- Allow admins to manage (insert/update) providers
CREATE POLICY "Allow all access for admins" ON public.accounting_providers
    FOR ALL TO authenticated USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
    );

-- 2. Documents
CREATE POLICY "Allow read access for authenticated users" ON public.accounting_documents
    FOR SELECT TO authenticated USING (true);

-- (Sync service uses service_role key, so it bypasses RLS for inserts)

-- 3. Mappings
CREATE POLICY "Allow read access for authenticated users" ON public.accounting_mappings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access for authenticated users" ON public.accounting_mappings
    FOR ALL TO authenticated USING (true); -- Allow users to create/delete mappings

-- 4. Sync Logs
CREATE POLICY "Allow read access for authenticated users" ON public.accounting_sync_logs
    FOR SELECT TO authenticated USING (true);
