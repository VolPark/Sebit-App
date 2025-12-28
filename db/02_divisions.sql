-- 1. Create Divisions Table
CREATE TABLE IF NOT EXISTS public.divisions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nazev text NOT NULL,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid REFERENCES public.organizations(id),
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Create Worker Divisions Junction Table
CREATE TABLE IF NOT EXISTS public.worker_divisions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    worker_id bigint REFERENCES public.pracovnici(id) ON DELETE CASCADE,
    division_id bigint REFERENCES public.divisions(id) ON DELETE CASCADE,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid REFERENCES public.organizations(id),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(worker_id, division_id)
);

-- 3. Add division_id to existing tables

-- Nabidky (Offers)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nabidky' AND column_name = 'division_id') THEN
        ALTER TABLE public.nabidky ADD COLUMN division_id bigint REFERENCES public.divisions(id);
    END IF;
END $$;

-- Akce (Projects)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'akce' AND column_name = 'division_id') THEN
        ALTER TABLE public.akce ADD COLUMN division_id bigint REFERENCES public.divisions(id);
    END IF;
END $$;

-- Finance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'finance' AND column_name = 'division_id') THEN
        ALTER TABLE public.finance ADD COLUMN division_id bigint REFERENCES public.divisions(id);
    END IF;
END $$;

-- Prace (Work Logs)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prace' AND column_name = 'division_id') THEN
        ALTER TABLE public.prace ADD COLUMN division_id bigint REFERENCES public.divisions(id);
    END IF;
END $$;


-- 4. Enable RLS and add basic policies (similar to existing organization check)

ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_divisions ENABLE ROW LEVEL SECURITY;

-- Divisions Policies
CREATE POLICY "Enable read access for authenticated users" ON public.divisions
    FOR SELECT
    TO authenticated
    USING (true); -- Or filter by organization if strict multi-tenant is enforced everywhere

CREATE POLICY "Enable insert access for authenticated users" ON public.divisions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.divisions
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.divisions
    FOR DELETE
    TO authenticated
    USING (true);


-- Worker Divisions Policies
CREATE POLICY "Enable read access for authenticated users" ON public.worker_divisions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable all access for authenticated users" ON public.worker_divisions
    FOR ALL
    TO authenticated
    USING (true);
