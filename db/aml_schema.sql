-- AML Toolbox Schema

-- Enable UUID extension if not already (it is in schema.sql but good practice)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AML PROFILES (Risk Rating & Status)
-- Links to existing 'klienti' table, but could also link to suppliers in future.
-- For now, we'll use a dynamic relation or just stick to linking to 'klienti' explicitly.
-- Given the requirement "Investor & Grant Teaser", it mentions checking suppliers too.
-- We'll creating a generalized 'aml_profiles' that can link to specific entity types.
CREATE TYPE public.aml_risk_rating AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.aml_status AS ENUM ('pending', 'cleared', 'review_required', 'blocked');

CREATE TABLE IF NOT EXISTS public.aml_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Entity Reference
    klient_id BIGINT REFERENCES public.klienti(id) ON DELETE CASCADE,
    -- Future: dodavatel_id BIGINT REFERENCES public.dodavatele(id) ...
    
    -- Core AML Data
    risk_rating public.aml_risk_rating DEFAULT 'low',
    status public.aml_status DEFAULT 'pending',
    last_check_date TIMESTAMP WITH TIME ZONE,
    next_check_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    risk_factors JSONB DEFAULT '[]'::jsonb, -- e.g. ["PEP", "High Risk Country"]
    notes TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_aml_profiles_klient_id ON public.aml_profiles(klient_id);

-- 2. AML CHECKS (Audit Log of Screenings)
CREATE TABLE IF NOT EXISTS public.aml_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    profile_id UUID REFERENCES public.aml_profiles(id) ON DELETE CASCADE,
    performed_by UUID REFERENCES auth.users(id), -- Or public.pracovnici(id) if that's the user model
    
    check_type TEXT NOT NULL, -- 'onboarding', 'periodic', 'transaction', 'manual'
    status TEXT NOT NULL, -- 'clean', 'hits_found', 'error'
    
    metadata JSONB DEFAULT '{}'::jsonb -- Stores raw response from screening provider
);

-- 3. AML HITS (Positive Matches)
CREATE TABLE IF NOT EXISTS public.aml_hits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    check_id UUID REFERENCES public.aml_checks(id) ON DELETE CASCADE,
    
    list_name TEXT NOT NULL, -- 'EU_SANCTIONS', 'OFAC', 'CZ_INSOLVENCY'
    match_score NUMERIC(5,2), -- 0.00 to 100.00
    matched_name TEXT,
    
    resolution TEXT DEFAULT 'open', -- 'false_positive', 'true_match', 'open'
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 4. AML ALERTS (Transaction Monitoring)
CREATE TABLE IF NOT EXISTS public.aml_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    profile_id UUID REFERENCES public.aml_profiles(id) ON DELETE CASCADE,
    
    rule_id TEXT, -- 'HIGH_VOLUME_CASH', 'FOREIGN_INCOMING'
    severity public.aml_risk_rating DEFAULT 'medium',
    description TEXT,
    
    is_closed BOOLEAN DEFAULT FALSE
);

-- 5. AML CASES (Case Management)
CREATE TYPE public.aml_case_status AS ENUM ('new', 'investigating', 'reported', 'closed_dismissed', 'closed_actioned');
CREATE TYPE public.aml_case_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE IF NOT EXISTS public.aml_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Case Details
    case_number TEXT UNIQUE DEFAULT ('CASE-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random() * 1000)::text),
    title TEXT NOT NULL,
    description TEXT,
    status public.aml_case_status DEFAULT 'new',
    priority public.aml_case_priority DEFAULT 'medium',
    
    -- assignment
    assigned_to UUID REFERENCES auth.users(id),
    
    -- Relations
    profile_id UUID REFERENCES public.aml_profiles(id),
    trigger_alert_id UUID REFERENCES public.aml_alerts(id),
    
    -- Reporting
    fau_report_reference TEXT -- Reference number if reported to FAÚ
);

-- RLS POLICIES (Allow access to authenticated users with proper roles)
-- For MVP, we'll allow authenticated users to read/write based on app logic, 
-- but ideally this should be cleaner.
ALTER TABLE public.aml_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_cases ENABLE ROW LEVEL SECURITY;

-- Simple policy: Authenticated users can view/edit everything for now
-- (Refining to specific roles 'owner', 'admin', 'compliance' would be next step)
CREATE POLICY "Enable all access for authenticated users" ON public.aml_profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.aml_checks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.aml_hits FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.aml_alerts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.aml_cases FOR ALL USING (auth.role() = 'authenticated');

-- FUNCTIONS
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_aml_profiles_modtime BEFORE UPDATE ON public.aml_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_aml_cases_modtime BEFORE UPDATE ON public.aml_cases FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
