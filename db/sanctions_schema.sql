-- Sanctions List Schema

-- Table to store raw/normalized sanction list entities
CREATE TABLE IF NOT EXISTS public.aml_sanction_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    list_name TEXT NOT NULL, -- 'EU', 'OFAC', 'UN'
    external_id TEXT NOT NULL, -- Unique ID from the source list (e.g. EU logicalId)
    
    name TEXT NOT NULL, -- Primary name (normalized)
    details JSONB DEFAULT '{}'::jsonb, -- Store full complexity here (aliases, addresses, birth dates)
    
    type TEXT, -- 'person', 'entity', 'vessel', etc.
    active BOOLEAN DEFAULT TRUE,
    
    -- Search Vector (for future full text search integration)
    search_vector tsvector
);

-- Index for fast lookups by external ID (for updates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_aml_sanction_items_external_id ON public.aml_sanction_list_items(list_name, external_id);

-- Index for name search (trigram usually best for names, but needs pg_trgm extension)
-- For now, simple standard index + full text search if needed
CREATE INDEX IF NOT EXISTS idx_aml_sanction_items_name ON public.aml_sanction_list_items(name);

-- RLS
ALTER TABLE public.aml_sanction_list_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated to read (for checks)
CREATE POLICY "Allow authenticated read" ON public.aml_sanction_list_items FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role (or specific admin) to write (for updates)
-- For simplicity in MVP, allowing authenticated (but in prod, restricting to service role is better)
CREATE POLICY "Allow authenticated insert/update" ON public.aml_sanction_list_items FOR ALL USING (auth.role() = 'authenticated');

-- 4. Create Logs Table
CREATE TABLE IF NOT EXISTS public.aml_sanction_update_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    list_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'failed', 'running'
    records_count INTEGER DEFAULT 0,
    message TEXT,
    duration_ms INTEGER
);

ALTER TABLE public.aml_sanction_update_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read logs" ON public.aml_sanction_update_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert logs" ON public.aml_sanction_update_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
