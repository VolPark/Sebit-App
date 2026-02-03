-- 1. Ensure Organizations table exists
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS on Organizations (if not already)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.organizations
    FOR SELECT TO authenticated USING (true);

-- 3. Insert Default Organization (Crucial for Divisions)
INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Organization')
ON CONFLICT (id) DO NOTHING;

-- 4. Ensure Divisions table exists
CREATE TABLE IF NOT EXISTS public.divisions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nazev text NOT NULL,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid REFERENCES public.organizations(id),
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Ensure RLS on Divisions
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.divisions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.divisions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.divisions;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.divisions;

-- Recreate Policies
CREATE POLICY "Enable read access for authenticated users" ON public.divisions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.divisions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.divisions
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.divisions
    FOR DELETE TO authenticated USING (true);

-- 6. Ensure Worker Divisions table exists (for completeness)
CREATE TABLE IF NOT EXISTS public.worker_divisions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    worker_id bigint REFERENCES public.pracovnici(id) ON DELETE CASCADE,
    division_id bigint REFERENCES public.divisions(id) ON DELETE CASCADE,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid REFERENCES public.organizations(id),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(worker_id, division_id)
);

ALTER TABLE public.worker_divisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.worker_divisions;

CREATE POLICY "Enable all access for authenticated users" ON public.worker_divisions
    FOR ALL TO authenticated USING (true);
