-- Execute this in Supabase SQL Editor to enable the new features

-- 1. Create Sanctions Table
CREATE TABLE IF NOT EXISTS public.aml_sanction_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    list_name TEXT NOT NULL,
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    type TEXT,
    active BOOLEAN DEFAULT TRUE,
    search_vector tsvector
);

-- 2. Create Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_aml_sanction_items_external_id ON public.aml_sanction_list_items(list_name, external_id);
CREATE INDEX IF NOT EXISTS idx_aml_sanction_items_name ON public.aml_sanction_list_items(name);

-- 3. Enable RLS
ALTER TABLE public.aml_sanction_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.aml_sanction_list_items;
CREATE POLICY "Allow authenticated read" ON public.aml_sanction_list_items FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert/update" ON public.aml_sanction_list_items;
CREATE POLICY "Allow authenticated insert/update" ON public.aml_sanction_list_items FOR ALL USING (auth.role() = 'authenticated');

-- 4. Create Logs Table
CREATE TABLE IF NOT EXISTS public.aml_sanction_update_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    list_name TEXT NOT NULL,
    status TEXT NOT NULL,
    records_count INTEGER DEFAULT 0,
    message TEXT,
    duration_ms INTEGER
);

ALTER TABLE public.aml_sanction_update_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read logs" ON public.aml_sanction_update_logs;
CREATE POLICY "Allow authenticated read logs" ON public.aml_sanction_update_logs FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert logs" ON public.aml_sanction_update_logs;
CREATE POLICY "Allow authenticated insert logs" ON public.aml_sanction_update_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
