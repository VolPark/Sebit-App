-- ============================================================================
-- SEBIT-app: Complete Database Setup for NEW Supabase Instance
-- ============================================================================
-- Generated from live DB dump on 2026-02-13.
-- This script is IDEMPOTENT – safe to run multiple times.
-- Run this in the Supabase SQL Editor after creating a new project.
--
-- Prerequisites:
--   1. Enable extensions in Supabase Dashboard > Database > Extensions:
--      pg_trgm, moddatetime (uuid-ossp is enabled by default)
--
-- Post-setup:
--   1. Create first user via Supabase Auth Dashboard
--   2. Manually insert their user_id into app_admins table
--   3. Update their role in profiles table to 'owner'
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- ============================================================================
-- SECTION 2: CUSTOM ENUMS
-- ============================================================================
DO $$ BEGIN CREATE TYPE app_role AS ENUM ('owner', 'admin', 'office', 'reporter'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE aml_risk_rating AS ENUM ('low', 'medium', 'high', 'critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE aml_status AS ENUM ('pending', 'cleared', 'review_required', 'blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE aml_case_status AS ENUM ('new', 'investigating', 'reported', 'closed_dismissed', 'closed_actioned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE aml_case_priority AS ENUM ('low', 'medium', 'high', 'urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE stav_vozidla AS ENUM ('aktivni', 'servis', 'neaktivni', 'vyrazeno'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE typ_paliva AS ENUM ('benzin', 'diesel', 'elektro', 'hybrid_plugin', 'hybrid', 'cng', 'lpg'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE typ_udrzby AS ENUM ('pravidelny_servis', 'oprava', 'stk', 'pneumatiky', 'nehoda', 'jine'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- SECTION 3: TABLES – Core Business
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text DEFAULT 'member',
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT organization_members_role_check CHECK (role = ANY (ARRAY['owner','admin','member'])),
    CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role app_role NOT NULL DEFAULT 'reporter',
    full_name text,
    updated_at timestamp with time zone,
    CONSTRAINT profiles_full_name_check CHECK (char_length(full_name) >= 3)
);

CREATE TABLE IF NOT EXISTS public.app_admins (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.klienti (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nazev text NOT NULL,
    sazba numeric,
    email text,
    poznamka text,
    organization_id uuid REFERENCES public.organizations(id),
    ico text,
    dic text,
    address text,
    kontaktni_osoba text,
    telefon text,
    web text
);

CREATE TABLE IF NOT EXISTS public.pracovnici (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    jmeno text NOT NULL,
    hodinova_mzda numeric,
    telefon text,
    is_active boolean DEFAULT true,
    organization_id uuid REFERENCES public.organizations(id),
    user_id uuid REFERENCES auth.users(id),
    role text
);

CREATE TABLE IF NOT EXISTS public.divisions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nazev text NOT NULL,
    organization_id uuid REFERENCES public.organizations(id),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.worker_divisions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    worker_id bigint REFERENCES public.pracovnici(id) ON DELETE CASCADE,
    division_id bigint REFERENCES public.divisions(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES public.organizations(id),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT worker_divisions_worker_id_division_id_key UNIQUE (worker_id, division_id)
);

CREATE TABLE IF NOT EXISTS public.akce (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nazev text NOT NULL,
    datum date NOT NULL,
    klient_id bigint REFERENCES public.klienti(id) ON DELETE SET NULL,
    cena_klient numeric(12,2) DEFAULT 0 NOT NULL,
    material_klient numeric(12,2) DEFAULT 0 NOT NULL,
    material_my numeric(12,2) DEFAULT 0 NOT NULL,
    odhad_hodin numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_completed boolean DEFAULT false,
    organization_id uuid REFERENCES public.organizations(id),
    division_id bigint REFERENCES public.divisions(id),
    project_type text DEFAULT 'STANDARD'
);

CREATE TABLE IF NOT EXISTS public.prace (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    datum date DEFAULT CURRENT_DATE,
    popis text,
    pocet_hodin numeric,
    klient_id bigint REFERENCES public.klienti(id),
    pracovnik_id bigint REFERENCES public.pracovnici(id),
    akce_id bigint REFERENCES public.akce(id) ON DELETE SET NULL,
    organization_id uuid REFERENCES public.organizations(id),
    division_id bigint REFERENCES public.divisions(id)
);

CREATE TABLE IF NOT EXISTS public.mzdy (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pracovnik_id bigint REFERENCES public.pracovnici(id) ON DELETE SET NULL,
    mesic integer NOT NULL,
    rok integer NOT NULL,
    hruba_mzda numeric,
    faktura numeric,
    priplatek numeric,
    created_at timestamp with time zone DEFAULT now(),
    organization_id uuid REFERENCES public.organizations(id),
    celkova_castka numeric GENERATED ALWAYS AS (COALESCE(hruba_mzda, 0) + COALESCE(faktura, 0) + COALESCE(priplatek, 0)) STORED,
    CONSTRAINT mzdy_pracovnik_id_mesic_rok_key UNIQUE (pracovnik_id, mesic, rok)
);

CREATE TABLE IF NOT EXISTS public.finance (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    datum date DEFAULT CURRENT_DATE,
    typ text,
    castka numeric,
    poznamka text,
    popis text,
    organization_id uuid REFERENCES public.organizations(id),
    division_id bigint REFERENCES public.divisions(id),
    akce_id bigint REFERENCES public.akce(id) ON DELETE SET NULL,
    variable_symbol text,
    invoice_number text,
    due_date date,
    supplier_ico text,
    supplier_name text,
    payment_method text DEFAULT 'Bank',
    category text,
    CONSTRAINT finance_typ_check CHECK (typ = ANY (ARRAY['Příjem','Výdej']))
);

CREATE TABLE IF NOT EXISTS public.fixed_costs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nazev text NOT NULL,
    castka numeric DEFAULT 0 NOT NULL,
    rok integer NOT NULL,
    mesic integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    organization_id uuid REFERENCES public.organizations(id),
    division_id bigint REFERENCES public.divisions(id)
);

CREATE TABLE IF NOT EXISTS public.nabidky_stavy (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nazev text NOT NULL,
    color text,
    poradi integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.nabidky (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    nazev text NOT NULL,
    klient_id bigint REFERENCES public.klienti(id),
    celkova_cena numeric DEFAULT 0,
    stav text DEFAULT 'rozpracováno',
    poznamka text,
    akce_id bigint REFERENCES public.akce(id),
    stav_id bigint REFERENCES public.nabidky_stavy(id),
    cislo text,
    platnost_do date,
    division_id bigint REFERENCES public.divisions(id),
    uvodni_text text,
    sleva_procenta numeric DEFAULT 0,
    zobrazeni_klienta text DEFAULT 'zakladni',
    zobrazeni_klienta_pole jsonb
);

CREATE TABLE IF NOT EXISTS public.polozky_typy (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nazev text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.polozky_nabidky (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nabidka_id bigint REFERENCES public.nabidky(id) ON DELETE CASCADE,
    nazev text NOT NULL,
    typ text DEFAULT 'produkt',
    mnozstvi numeric DEFAULT 1,
    cena_ks numeric DEFAULT 0,
    celkem numeric GENERATED ALWAYS AS (COALESCE(mnozstvi, 0) * COALESCE(cena_ks, 0)) STORED,
    popis text,
    obrazek_url text,
    sazba_dph numeric DEFAULT 21,
    je_sleva boolean DEFAULT false,
    poradi integer DEFAULT 0
);

-- ============================================================================
-- SECTION 4: TABLES – Accounting
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.accounting_providers (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    is_enabled boolean DEFAULT false,
    config jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_contacts (
    id text NOT NULL PRIMARY KEY,
    name text,
    company_number text,
    vatin text,
    city text,
    street text,
    postal_code text,
    country text,
    account_number text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_documents (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    provider_id bigint REFERENCES public.accounting_providers(id),
    external_id text NOT NULL,
    type text NOT NULL,
    number text,
    supplier_name text,
    supplier_ico text,
    amount numeric,
    currency text DEFAULT 'CZK',
    issue_date date,
    due_date date,
    tax_date date,
    description text,
    status text,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    supplier_dic text,
    paid_amount numeric DEFAULT 0,
    amount_czk numeric,
    exchange_rate numeric,
    manually_paid boolean DEFAULT false,
    contact_id text REFERENCES public.accounting_contacts(id),
    CONSTRAINT accounting_documents_provider_id_external_id_type_key UNIQUE (provider_id, external_id, type)
);

CREATE TABLE IF NOT EXISTS public.accounting_mappings (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    document_id bigint REFERENCES public.accounting_documents(id) ON DELETE CASCADE,
    akce_id bigint REFERENCES public.akce(id) ON DELETE SET NULL,
    pracovnik_id bigint REFERENCES public.pracovnici(id) ON DELETE SET NULL,
    division_id bigint REFERENCES public.divisions(id) ON DELETE SET NULL,
    cost_category text,
    amount numeric NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now(),
    amount_czk numeric
);

CREATE TABLE IF NOT EXISTS public.accounting_sync_logs (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    provider_id bigint REFERENCES public.accounting_providers(id),
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    status text,
    records_processed integer DEFAULT 0,
    error_message text
);

CREATE TABLE IF NOT EXISTS public.accounting_journal (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    uol_id text NOT NULL UNIQUE,
    date date NOT NULL,
    account_md text NOT NULL,
    account_d text NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'CZK' NOT NULL,
    text text,
    fiscal_year integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.accounting_bank_accounts (
    bank_account_id text NOT NULL PRIMARY KEY,
    custom_name text,
    created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    account_number text,
    bank_code text,
    currency text,
    opening_balance numeric(15,2) DEFAULT 0,
    name text,
    last_synced_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.accounting_bank_movements (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    bank_account_id text NOT NULL,
    movement_id text NOT NULL UNIQUE,
    date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'CZK' NOT NULL,
    variable_symbol text,
    description text,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.accounting_accounts (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    type text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.currency_rates (
    date date NOT NULL,
    currency text NOT NULL,
    rate numeric NOT NULL,
    amount numeric DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (date, currency)
);

-- ============================================================================
-- SECTION 5: TABLES – AML
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.aml_profiles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    klient_id bigint REFERENCES public.klienti(id) ON DELETE CASCADE,
    risk_rating aml_risk_rating DEFAULT 'low',
    status aml_status DEFAULT 'pending',
    last_check_date timestamp with time zone,
    next_check_date timestamp with time zone,
    risk_factors jsonb DEFAULT '[]',
    notes text
);

CREATE TABLE IF NOT EXISTS public.aml_checks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    profile_id uuid REFERENCES public.aml_profiles(id) ON DELETE CASCADE,
    performed_by uuid REFERENCES auth.users(id),
    check_type text NOT NULL,
    status text NOT NULL,
    metadata jsonb DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.aml_hits (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    check_id uuid REFERENCES public.aml_checks(id) ON DELETE CASCADE,
    list_name text NOT NULL,
    match_score numeric(5,2),
    matched_name text,
    resolution text DEFAULT 'open',
    resolution_notes text,
    resolved_by uuid REFERENCES auth.users(id),
    resolved_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.aml_alerts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    profile_id uuid REFERENCES public.aml_profiles(id) ON DELETE CASCADE,
    rule_id text,
    severity aml_risk_rating DEFAULT 'medium',
    description text,
    is_closed boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.aml_cases (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    case_number text DEFAULT ('CASE-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random() * 1000)::text) UNIQUE,
    title text NOT NULL,
    description text,
    status aml_case_status DEFAULT 'new',
    priority aml_case_priority DEFAULT 'medium',
    assigned_to uuid REFERENCES auth.users(id),
    profile_id uuid REFERENCES public.aml_profiles(id),
    trigger_alert_id uuid REFERENCES public.aml_alerts(id),
    fau_report_reference text
);

CREATE TABLE IF NOT EXISTS public.aml_sanction_list_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    list_name text NOT NULL,
    external_id text NOT NULL,
    name text NOT NULL,
    details jsonb DEFAULT '{}',
    type text,
    active boolean DEFAULT true,
    search_vector tsvector
);

CREATE TABLE IF NOT EXISTS public.aml_sanction_update_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    list_name text NOT NULL,
    status text NOT NULL,
    records_count integer DEFAULT 0,
    message text,
    duration_ms integer
);

-- ============================================================================
-- SECTION 6: TABLES – Suppliers & Inventory
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL,
    config jsonb DEFAULT '{}' NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT suppliers_type_check CHECK (type = ANY (ARRAY['sftp_xml','sftp_csv','api_rest','sftp_demos']))
);

CREATE TABLE IF NOT EXISTS public.supplier_items (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    supplier_id bigint NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    currency text DEFAULT 'CZK' NOT NULL,
    unit text,
    image_url text,
    category text,
    metadata jsonb DEFAULT '{}',
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT supplier_items_supplier_id_code_key UNIQUE (supplier_id, code)
);

CREATE TABLE IF NOT EXISTS public.inventory_centers (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    color text DEFAULT '#64748b',
    created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    description text,
    ean text,
    sku text,
    quantity numeric DEFAULT 0 NOT NULL,
    unit text DEFAULT 'ks',
    min_quantity numeric DEFAULT 0,
    avg_price numeric DEFAULT 0,
    last_purchase_price numeric DEFAULT 0,
    location text,
    supplier_item_id bigint REFERENCES public.supplier_items(id),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    manufacturer text,
    image_url text
);

CREATE TABLE IF NOT EXISTS public.inventory_stock (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    inventory_item_id bigint NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    center_id bigint NOT NULL REFERENCES public.inventory_centers(id) ON DELETE CASCADE,
    quantity numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT inventory_stock_inventory_item_id_center_id_key UNIQUE (inventory_item_id, center_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    inventory_item_id bigint NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    type text NOT NULL,
    quantity numeric NOT NULL,
    quantity_change numeric NOT NULL,
    price numeric,
    reference_number text,
    note text,
    action_id bigint REFERENCES public.akce(id),
    user_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    center_id bigint NOT NULL REFERENCES public.inventory_centers(id),
    target_center_id bigint REFERENCES public.inventory_centers(id),
    CONSTRAINT inventory_movements_type_check CHECK (type = ANY (ARRAY['RECEIPT','ISSUE','AUDIT','RETURN','TRANSFER']))
);

-- ============================================================================
-- SECTION 7: TABLES – Fleet
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vozidla (
    id bigint NOT NULL PRIMARY KEY,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    vin varchar(17) NOT NULL UNIQUE,
    spz varchar(20) NOT NULL UNIQUE,
    znacka varchar(100) NOT NULL,
    model varchar(100) NOT NULL,
    rok_vyroby smallint NOT NULL,
    typ_paliva typ_paliva NOT NULL,
    barva varchar(50),
    stav stav_vozidla DEFAULT 'aktivni' NOT NULL,
    najezd_km integer DEFAULT 0,
    prideleny_pracovnik_id bigint REFERENCES public.pracovnici(id) ON DELETE SET NULL,
    pojisteni_do date,
    pojistovna varchar(255),
    stk_do date,
    emisni_kontrola_do date,
    datum_porizeni date,
    kupni_cena numeric(10,2),
    leasing boolean DEFAULT false,
    leasing_mesicni_splatka numeric(10,2),
    leasing_do date,
    bmw_cardata_aktivni boolean DEFAULT false,
    bmw_client_id varchar(255),
    bmw_refresh_token text,
    bmw_access_token text,
    bmw_token_expiry timestamp with time zone,
    poznamka text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vin_data jsonb,
    vin_data_fetched_at timestamp with time zone
);

CREATE SEQUENCE IF NOT EXISTS public.vozidla_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.vozidla_id_seq OWNED BY public.vozidla.id;
ALTER TABLE ONLY public.vozidla ALTER COLUMN id SET DEFAULT nextval('public.vozidla_id_seq');

CREATE TABLE IF NOT EXISTS public.vozidla_udrzba (
    id bigint NOT NULL PRIMARY KEY,
    vozidlo_id bigint NOT NULL REFERENCES public.vozidla(id) ON DELETE CASCADE,
    typ typ_udrzby NOT NULL,
    popis text NOT NULL,
    servisni_partner varchar(255),
    datum_od date NOT NULL,
    datum_do date,
    najezd_pri_udrzbe integer,
    naklady numeric(10,2),
    mena varchar(3) DEFAULT 'CZK',
    faktura_url text,
    poznamka text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.vozidla_udrzba_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.vozidla_udrzba_id_seq OWNED BY public.vozidla_udrzba.id;
ALTER TABLE ONLY public.vozidla_udrzba ALTER COLUMN id SET DEFAULT nextval('public.vozidla_udrzba_id_seq');

CREATE TABLE IF NOT EXISTS public.vozidla_palivo (
    id bigint NOT NULL PRIMARY KEY,
    vozidlo_id bigint NOT NULL REFERENCES public.vozidla(id) ON DELETE CASCADE,
    ridic_id bigint REFERENCES public.pracovnici(id) ON DELETE SET NULL,
    datum date NOT NULL,
    najezd_km integer NOT NULL,
    litry numeric(6,2) NOT NULL,
    cena_za_litr numeric(6,2),
    celkova_cena numeric(8,2),
    mena varchar(3) DEFAULT 'CZK',
    plna_nadrz boolean DEFAULT true,
    typ_paliva varchar(50),
    cerpadlo varchar(255),
    poznamka text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.vozidla_palivo_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.vozidla_palivo_id_seq OWNED BY public.vozidla_palivo.id;
ALTER TABLE ONLY public.vozidla_palivo ALTER COLUMN id SET DEFAULT nextval('public.vozidla_palivo_id_seq');

CREATE TABLE IF NOT EXISTS public.bmw_oauth_states (
    id bigint NOT NULL PRIMARY KEY,
    csrf_token varchar(64) NOT NULL UNIQUE,
    vehicle_id bigint NOT NULL REFERENCES public.vozidla(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.bmw_oauth_states_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.bmw_oauth_states_id_seq OWNED BY public.bmw_oauth_states.id;
ALTER TABLE ONLY public.bmw_oauth_states ALTER COLUMN id SET DEFAULT nextval('public.bmw_oauth_states_id_seq');


-- ============================================================================
-- SECTION 8: FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_token_match(query text, target text) RETURNS double precision
    LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  q_tokens text[]; t_tokens text[]; overlap_count int; q_len int;
BEGIN
  q_tokens := string_to_array(trim(lower(unaccent(query))), ' ');
  t_tokens := string_to_array(trim(lower(unaccent(target))), ' ');
  SELECT array_agg(x) INTO q_tokens FROM unnest(q_tokens) x WHERE length(x) > 0;
  SELECT array_agg(x) INTO t_tokens FROM unnest(t_tokens) x WHERE length(x) > 0;
  q_len := array_length(q_tokens, 1);
  IF q_len IS NULL OR q_len = 0 THEN RETURN 0; END IF;
  SELECT count(*) INTO overlap_count FROM unnest(q_tokens) q WHERE q = ANY(t_tokens);
  RETURN overlap_count::float / q_len::float;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_offer_number() RETURNS trigger
    LANGUAGE plpgsql AS $$
DECLARE
  year_val INT; max_seq INT; new_seq INT;
BEGIN
  year_val := EXTRACT(YEAR FROM COALESCE(NEW.created_at, NOW()));
  SELECT COALESCE(MAX(SPLIT_PART(cislo, '/', 2)::INT), 0) INTO max_seq
  FROM nabidky WHERE cislo LIKE 'N' || year_val || '/%';
  new_seq := max_seq + 1;
  NEW.cislo := 'N' || year_val || '/' || LPAD(new_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_bank_movements_sum(account_id text) RETURNS numeric
    LANGUAGE sql SECURITY DEFINER AS $$
  select coalesce(sum(amount), 0) from accounting_bank_movements where bank_account_id = account_id;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(start_date date, end_date date, p_pracovnik_id bigint DEFAULT NULL, p_klient_id bigint DEFAULT NULL) RETURNS jsonb
    LANGUAGE plpgsql AS $$
DECLARE
    v_total_revenue NUMERIC := 0; v_total_material_cost NUMERIC := 0;
    v_total_material_klient NUMERIC := 0; v_material_profit NUMERIC := 0;
    v_total_estimated_hours NUMERIC := 0; v_total_labor_cost NUMERIC := 0;
    v_total_hours NUMERIC := 0; v_avg_company_rate NUMERIC := 0;
    v_average_hourly_wage NUMERIC := 0; v_average_monthly_wage NUMERIC := 0;
    v_estimated_vs_actual_hours_ratio NUMERIC := 0;
    v_top_clients JSONB; v_top_workers JSONB;
    v_monthly_data JSONB := '[]'; v_current_month DATE;
    v_month_start DATE; v_month_end DATE;
    m_total_revenue NUMERIC; m_total_material_cost NUMERIC;
    m_total_material_klient NUMERIC; m_material_profit NUMERIC;
    m_total_estimated_hours NUMERIC; m_total_labor_cost NUMERIC;
    m_total_hours NUMERIC; m_month_name TEXT;
    v_num_months_for_avg NUMERIC := 0; v_unique_employees_for_avg_wage BIGINT;
BEGIN
    IF (start_date = date_trunc('month', start_date) AND end_date = date_trunc('month', end_date) + interval '1 month - 1 day') AND (end_date - start_date + 1 > 31) THEN
        v_current_month := date_trunc('month', start_date);
        WHILE v_current_month <= date_trunc('month', end_date) LOOP
            v_month_start := v_current_month;
            v_month_end := (v_current_month + interval '1 month - 1 day');
            m_total_revenue := 0; m_total_material_cost := 0; m_total_material_klient := 0;
            m_material_profit := 0; m_total_estimated_hours := 0; m_total_labor_cost := 0; m_total_hours := 0;

            SELECT COALESCE(SUM(a.cena_klient),0), COALESCE(SUM(a.material_my),0),
                   COALESCE(SUM(a.material_klient),0), COALESCE(SUM(a.material_klient - a.material_my),0),
                   COALESCE(SUM(a.odhad_hodin),0)
            INTO m_total_revenue, m_total_material_cost, m_total_material_klient, m_material_profit, m_total_estimated_hours
            FROM public.akce AS a
            WHERE a.datum BETWEEN v_month_start AND v_month_end AND (p_klient_id IS NULL OR a.klient_id = p_klient_id);

            IF p_klient_id IS NULL THEN
                SELECT COALESCE(SUM(m.celkova_castka),0) INTO m_total_labor_cost FROM public.mzdy AS m
                WHERE m.rok = EXTRACT(YEAR FROM v_month_start) AND m.mesic = EXTRACT(MONTH FROM v_month_start)
                  AND (p_pracovnik_id IS NULL OR m.pracovnik_id = p_pracovnik_id);
                SELECT COALESCE(SUM(p.pocet_hodin),0) INTO m_total_hours FROM public.prace AS p
                WHERE p.datum BETWEEN v_month_start AND v_month_end AND (p_pracovnik_id IS NULL OR p.pracovnik_id = p_pracovnik_id);
            ELSE
                WITH worker_monthly_hours AS (
                    SELECT p.pracovnik_id, SUM(p.pocet_hodin) as total_hours FROM public.prace p
                    WHERE p.datum BETWEEN v_month_start AND v_month_end GROUP BY p.pracovnik_id
                ), worker_hourly_rate AS (
                    SELECT m.pracovnik_id, (m.celkova_castka / NULLIF(wmh.total_hours, 0)) as rate
                    FROM public.mzdy m JOIN worker_monthly_hours wmh ON m.pracovnik_id = wmh.pracovnik_id
                    WHERE m.rok = EXTRACT(YEAR FROM v_month_start) AND m.mesic = EXTRACT(MONTH FROM v_month_start)
                )
                SELECT COALESCE(SUM(p.pocet_hodin * whr.rate),0), COALESCE(SUM(p.pocet_hodin),0)
                INTO m_total_labor_cost, m_total_hours
                FROM public.prace p JOIN worker_hourly_rate whr ON p.pracovnik_id = whr.pracovnik_id
                WHERE p.datum BETWEEN v_month_start AND v_month_end AND p.klient_id = p_klient_id
                  AND (p_pracovnik_id IS NULL OR p.pracovnik_id = p_pracovnik_id);
            END IF;

            m_month_name := CASE EXTRACT(MONTH FROM v_month_start)
                WHEN 1 THEN 'Led' WHEN 2 THEN 'Úno' WHEN 3 THEN 'Bře' WHEN 4 THEN 'Dub'
                WHEN 5 THEN 'Kvě' WHEN 6 THEN 'Čvn' WHEN 7 THEN 'Čvc' WHEN 8 THEN 'Srp'
                WHEN 9 THEN 'Zář' WHEN 10 THEN 'Říj' WHEN 11 THEN 'Lis' WHEN 12 THEN 'Pro'
            END;

            v_monthly_data := jsonb_insert(v_monthly_data, '{999}', jsonb_build_object(
                'month', m_month_name, 'year', EXTRACT(YEAR FROM v_month_start),
                'totalRevenue', m_total_revenue, 'totalCosts', m_total_material_cost + m_total_labor_cost,
                'grossProfit', m_total_revenue - (m_total_material_cost + m_total_labor_cost),
                'totalHours', m_total_hours, 'materialProfit', m_material_profit,
                'totalMaterialKlient', m_total_material_klient, 'totalLaborCost', m_total_labor_cost,
                'totalEstimatedHours', m_total_estimated_hours
            ), TRUE);

            v_total_revenue := v_total_revenue + m_total_revenue;
            v_total_material_cost := v_total_material_cost + m_total_material_cost;
            v_total_material_klient := v_total_material_klient + m_total_material_klient;
            v_material_profit := v_material_profit + m_material_profit;
            v_total_estimated_hours := v_total_estimated_hours + m_total_estimated_hours;
            v_total_labor_cost := v_total_labor_cost + m_total_labor_cost;
            v_total_hours := v_total_hours + m_total_hours;
            v_current_month := v_current_month + interval '1 month';
            v_num_months_for_avg := v_num_months_for_avg + 1;
        END LOOP;
    ELSE
        SELECT COALESCE(SUM(a.cena_klient),0), COALESCE(SUM(a.material_my),0),
               COALESCE(SUM(a.material_klient),0), COALESCE(SUM(a.material_klient - a.material_my),0),
               COALESCE(SUM(a.odhad_hodin),0)
        INTO v_total_revenue, v_total_material_cost, v_total_material_klient, v_material_profit, v_total_estimated_hours
        FROM public.akce AS a WHERE a.datum BETWEEN start_date AND end_date AND (p_klient_id IS NULL OR a.klient_id = p_klient_id);

        IF p_klient_id IS NULL THEN
            SELECT COALESCE(SUM(m.celkova_castka),0) INTO v_total_labor_cost FROM public.mzdy AS m
            WHERE m.rok * 100 + m.mesic >= EXTRACT(YEAR FROM start_date) * 100 + EXTRACT(MONTH FROM start_date)
              AND m.rok * 100 + m.mesic <= EXTRACT(YEAR FROM end_date) * 100 + EXTRACT(MONTH FROM end_date)
              AND (p_pracovnik_id IS NULL OR m.pracovnik_id = p_pracovnik_id);
            SELECT COALESCE(SUM(p.pocet_hodin),0) INTO v_total_hours FROM public.prace AS p
            WHERE p.datum BETWEEN start_date AND end_date AND (p_pracovnik_id IS NULL OR p.pracovnik_id = p_pracovnik_id)
              AND (p_klient_id IS NULL OR p.klient_id = p_klient_id);
        ELSE
            WITH worker_period_hours AS (
                SELECT p.pracovnik_id, p.rok_mesic, SUM(p.pocet_hodin) as total_hours
                FROM (SELECT *, to_char(datum, 'YYYY-MM') as rok_mesic FROM public.prace) p
                WHERE p.datum BETWEEN start_date AND end_date GROUP BY p.pracovnik_id, p.rok_mesic
            ), worker_hourly_rate AS (
                SELECT m.pracovnik_id, to_char(make_date(m.rok, m.mesic, 1), 'YYYY-MM') as rok_mesic,
                       (m.celkova_castka / NULLIF(wph.total_hours, 0)) as rate
                FROM public.mzdy m JOIN worker_period_hours wph ON m.pracovnik_id = wph.pracovnik_id
                  AND to_char(make_date(m.rok, m.mesic, 1), 'YYYY-MM') = wph.rok_mesic
            )
            SELECT COALESCE(SUM(p.pocet_hodin * whr.rate),0), COALESCE(SUM(p.pocet_hodin),0)
            INTO v_total_labor_cost, v_total_hours
            FROM (SELECT *, to_char(datum, 'YYYY-MM') as rok_mesic FROM public.prace) p
            JOIN worker_hourly_rate whr ON p.pracovnik_id = whr.pracovnik_id AND p.rok_mesic = whr.rok_mesic
            WHERE p.datum BETWEEN start_date AND end_date AND p.klient_id = p_klient_id
              AND (p_pracovnik_id IS NULL OR p.pracovnik_id = p_pracovnik_id);
        END IF;

        IF v_num_months_for_avg = 0 THEN
            SELECT CEIL(EXTRACT(DAY FROM (end_date - start_date + 1)) / 30.4375) INTO v_num_months_for_avg;
            IF v_num_months_for_avg < 1 THEN v_num_months_for_avg := 1; END IF;
        END IF;
    END IF;

    DECLARE
        v_total_costs NUMERIC := v_total_material_cost + v_total_labor_cost;
        v_gross_profit NUMERIC := v_total_revenue - v_total_costs;
    BEGIN
        v_avg_company_rate := CASE WHEN v_total_hours > 0 THEN (v_total_revenue - v_total_material_klient) / v_total_hours ELSE 0 END;
        v_average_hourly_wage := CASE WHEN v_total_hours > 0 THEN v_total_labor_cost / v_total_hours ELSE 0 END;

        IF p_klient_id IS NULL THEN
            IF start_date = date_trunc('month', start_date) AND end_date = date_trunc('month', end_date) + interval '1 month - 1 day' THEN
                SELECT COUNT(DISTINCT pracovnik_id) INTO v_unique_employees_for_avg_wage FROM public.mzdy
                WHERE rok = EXTRACT(YEAR FROM start_date) AND mesic = EXTRACT(MONTH FROM start_date)
                  AND (p_pracovnik_id IS NULL OR pracovnik_id = p_pracovnik_id);
                v_average_monthly_wage := CASE WHEN v_unique_employees_for_avg_wage > 0 THEN v_total_labor_cost / v_unique_employees_for_avg_wage ELSE 0 END;
            ELSIF EXTRACT(MONTH FROM start_date) = 1 AND EXTRACT(MONTH FROM end_date) = 12 AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM end_date) THEN
                SELECT COUNT(DISTINCT pracovnik_id) INTO v_unique_employees_for_avg_wage FROM public.mzdy
                WHERE rok = EXTRACT(YEAR FROM start_date) AND (p_pracovnik_id IS NULL OR pracovnik_id = p_pracovnik_id);
                v_average_monthly_wage := CASE WHEN v_unique_employees_for_avg_wage > 0 THEN (v_total_labor_cost / v_unique_employees_for_avg_wage) / 12 ELSE 0 END;
            ELSE
                v_average_monthly_wage := CASE WHEN v_num_months_for_avg > 0 THEN v_total_labor_cost / v_num_months_for_avg ELSE 0 END;
            END IF;
        ELSE
            v_average_monthly_wage := 0;
        END IF;
        v_estimated_vs_actual_hours_ratio := CASE WHEN v_total_estimated_hours > 0 THEN v_total_hours / v_total_estimated_hours ELSE 0 END;
    END;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'klient_id', a.klient_id, 'nazev', k.nazev,
            'total', COALESCE(SUM(a.cena_klient), 0)
        ) ORDER BY COALESCE(SUM(a.cena_klient), 0) DESC), '[]'::jsonb)
    INTO v_top_clients FROM public.akce AS a LEFT JOIN public.klienti AS k ON a.klient_id = k.id
    WHERE a.datum BETWEEN start_date AND end_date AND (p_klient_id IS NULL OR a.klient_id = p_klient_id)
    GROUP BY a.klient_id, k.nazev LIMIT 5;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'pracovnik_id', p.pracovnik_id, 'jmeno', pr.jmeno,
            'total', COALESCE(SUM(p.pocet_hodin), 0)
        ) ORDER BY COALESCE(SUM(p.pocet_hodin), 0) DESC), '[]'::jsonb)
    INTO v_top_workers FROM public.prace AS p LEFT JOIN public.pracovnici AS pr ON p.pracovnik_id = pr.id
    WHERE p.datum BETWEEN start_date AND end_date AND (p_pracovnik_id IS NULL OR p.pracovnik_id = p_pracovnik_id)
      AND (p_klient_id IS NULL OR p.klient_id = p_klient_id)
    GROUP BY p.pracovnik_id, pr.jmeno LIMIT 5;

    RETURN jsonb_build_object(
        'totalRevenue', v_total_revenue, 'totalCosts', (v_total_material_cost + v_total_labor_cost),
        'grossProfit', (v_total_revenue - (v_total_material_cost + v_total_labor_cost)),
        'materialProfit', v_material_profit, 'totalHours', v_total_hours,
        'avgCompanyRate', v_avg_company_rate, 'averageHourlyWage', v_average_hourly_wage,
        'averageMonthlyWage', v_average_monthly_wage,
        'estimatedVsActualHoursRatio', v_estimated_vs_actual_hours_ratio,
        'topClients', v_top_clients, 'topWorkers', v_top_workers,
        'monthlyData', v_monthly_data,
        'prevPeriod', jsonb_build_object('totalRevenue', 0, 'totalCosts', 0, 'grossProfit', 0)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_profiles_roles(user_ids uuid[]) RETURNS TABLE(id uuid, role app_role)
    LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  select id, role from public.profiles where id = any(user_ids);
$$;

CREATE OR REPLACE FUNCTION public.get_worker_costs_for_month(p_year integer, p_month integer, p_worker_ids bigint[] DEFAULT NULL) RETURNS TABLE(worker_id bigint, total_cost numeric)
    LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT am.pracovnik_id, COALESCE(SUM(am.amount), 0) as total_cost
  FROM public.accounting_mappings am
  JOIN public.accounting_documents ad ON am.document_id = ad.id
  WHERE am.pracovnik_id IS NOT NULL
    AND (p_worker_ids IS NULL OR am.pracovnik_id = ANY(p_worker_ids))
    AND EXTRACT(YEAR FROM ad.issue_date) = p_year
    AND EXTRACT(MONTH FROM ad.issue_date) = p_month
  GROUP BY am.pracovnik_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'reporter')
  on conflict (id) do nothing;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin')
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.match_parties(query_name text, similarity_threshold double precision DEFAULT 0.4, query_birth_date date DEFAULT NULL, query_country text DEFAULT NULL)
RETURNS TABLE(id uuid, name text, list_name text, external_id text, birth_dates jsonb, citizenships jsonb, details jsonb, similarity double precision, matched_alias text, match_details jsonb)
    LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH matched_items AS (
      SELECT item.id, item.name::text, item.list_name::text, item.external_id::text,
        item.details->'birthDates' as birth_dates, item.details->'citizenships' as citizenships,
        item.details,
        GREATEST(similarity(item.name, query_name), calculate_token_match(query_name, item.name))::float AS base_sim,
        NULL::text as alias_hit
      FROM public.aml_sanction_list_items item
      WHERE (item.name % query_name OR similarity(item.name, query_name) > 0.1)
      UNION ALL
      SELECT item.id, item.name::text, item.list_name::text, item.external_id::text,
        item.details->'birthDates' as birth_dates, item.details->'citizenships' as citizenships,
        item.details,
        GREATEST(similarity(alias_obj->>'wholeName', query_name), calculate_token_match(query_name, alias_obj->>'wholeName'))::float AS base_sim,
        (alias_obj->>'wholeName')::text as alias_hit
      FROM public.aml_sanction_list_items item, jsonb_array_elements(item.details -> 'nameAliases') alias_obj
      WHERE ((alias_obj->>'wholeName') % query_name OR similarity(alias_obj->>'wholeName', query_name) > 0.1)
  )
  SELECT mi.id, mi.name, mi.list_name, mi.external_id, mi.birth_dates, mi.citizenships, mi.details,
      LEAST(1.0,
        (MAX(mi.base_sim) * 0.90) +
        MAX(CASE WHEN query_birth_date IS NOT NULL AND mi.birth_dates IS NOT NULL THEN
            CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(mi.birth_dates) bd_obj WHERE bd_obj->>'date' = to_char(query_birth_date, 'YYYY-MM-DD')) THEN 0.25
                 WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(mi.birth_dates) bd_obj WHERE left(bd_obj->>'date', 4) = to_char(query_birth_date, 'YYYY')) THEN 0.10
                 ELSE 0 END
            ELSE 0 END) +
        MAX(CASE WHEN query_country IS NOT NULL AND mi.citizenships IS NOT NULL THEN
            CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(mi.citizenships) c_obj WHERE c_obj->>'countryIso' = query_country) THEN 0.15
                 ELSE 0 END
            ELSE 0 END)
      ) as similarity,
      MAX(mi.alias_hit) as matched_alias,
      jsonb_build_object(
          'base_score', MAX(mi.base_sim),
          'dob_boost', MAX(CASE WHEN query_birth_date IS NOT NULL AND mi.birth_dates IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(mi.birth_dates) bd_obj WHERE bd_obj->>'date' = to_char(query_birth_date, 'YYYY-MM-DD')) THEN 0.25 ELSE 0 END),
          'country_boost', MAX(CASE WHEN query_country IS NOT NULL AND mi.citizenships IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(mi.citizenships) c_obj WHERE c_obj->>'countryIso' = query_country) THEN 0.15 ELSE 0 END)
      ) as match_details
  FROM matched_items mi WHERE mi.base_sim >= similarity_threshold
  GROUP BY mi.id, mi.name, mi.list_name, mi.external_id, mi.birth_dates, mi.citizenships, mi.details
  ORDER BY similarity DESC LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_item_total() RETURNS trigger
    LANGUAGE plpgsql AS $$
begin
  update public.inventory_items
  set quantity = (select coalesce(sum(quantity), 0) from public.inventory_stock
    where inventory_item_id = coalesce(new.inventory_item_id, old.inventory_item_id))
  where id = coalesce(new.inventory_item_id, old.inventory_item_id);
  return null;
end;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_vozidla_updated_at() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


-- ============================================================================
-- SECTION 9: INDEXES
-- ============================================================================

-- Accounting indexes
CREATE INDEX IF NOT EXISTS accounting_accounts_code_idx ON public.accounting_accounts USING btree (code);
CREATE INDEX IF NOT EXISTS accounting_bank_movements_bank_account_id_idx ON public.accounting_bank_movements USING btree (bank_account_id);
CREATE INDEX IF NOT EXISTS accounting_bank_movements_date_idx ON public.accounting_bank_movements USING btree (date);
CREATE INDEX IF NOT EXISTS accounting_journal_account_d_idx ON public.accounting_journal USING btree (account_d);
CREATE INDEX IF NOT EXISTS accounting_journal_account_md_idx ON public.accounting_journal USING btree (account_md);
CREATE INDEX IF NOT EXISTS accounting_journal_date_idx ON public.accounting_journal USING btree (date);
CREATE INDEX IF NOT EXISTS accounting_journal_fiscal_year_idx ON public.accounting_journal USING btree (fiscal_year);
CREATE INDEX IF NOT EXISTS idx_accounting_documents_external_id ON public.accounting_documents USING btree (external_id);
CREATE INDEX IF NOT EXISTS idx_accounting_documents_type ON public.accounting_documents USING btree (type);
CREATE INDEX IF NOT EXISTS idx_accounting_mappings_akce_id ON public.accounting_mappings USING btree (akce_id);

-- Core business indexes
CREATE INDEX IF NOT EXISTS idx_akce_datum ON public.akce USING btree (datum);
CREATE INDEX IF NOT EXISTS idx_akce_klient ON public.akce USING btree (klient_id);
CREATE INDEX IF NOT EXISTS idx_akce_klient_org ON public.akce USING btree (organization_id, klient_id);
CREATE INDEX IF NOT EXISTS idx_finance_organization_id ON public.finance USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_prace_org_datum ON public.prace USING btree (organization_id, datum DESC);
CREATE INDEX IF NOT EXISTS idx_prace_pracovnik_org ON public.prace USING btree (organization_id, pracovnik_id);
CREATE INDEX IF NOT EXISTS idx_polozky_nabidky_poradi ON public.polozky_nabidky USING btree (nabidka_id, poradi);

-- AML indexes
CREATE INDEX IF NOT EXISTS idx_aml_profiles_klient_id ON public.aml_profiles USING btree (klient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_aml_sanction_items_external_id ON public.aml_sanction_list_items USING btree (list_name, external_id);
CREATE INDEX IF NOT EXISTS idx_aml_sanction_items_name ON public.aml_sanction_list_items USING btree (name);

-- Supplier & Inventory indexes
CREATE INDEX IF NOT EXISTS idx_supplier_items_code ON public.supplier_items USING btree (code);
CREATE INDEX IF NOT EXISTS idx_supplier_items_name_search ON public.supplier_items USING gin (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_supplier_items_supplier_id ON public.supplier_items USING btree (supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_ean ON public.inventory_items USING btree (ean);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON public.inventory_items USING gin (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_inventory_movements_action_id ON public.inventory_movements USING btree (action_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON public.inventory_movements USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON public.inventory_movements USING btree (inventory_item_id);

-- Fleet indexes
CREATE INDEX IF NOT EXISTS idx_bmw_oauth_states_csrf ON public.bmw_oauth_states USING btree (csrf_token);
CREATE INDEX IF NOT EXISTS idx_bmw_oauth_states_expiry ON public.bmw_oauth_states USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_currency_rates_date ON public.currency_rates USING btree (date);
CREATE INDEX IF NOT EXISTS idx_palivo_vozidlo ON public.vozidla_palivo USING btree (vozidlo_id, datum DESC);
CREATE INDEX IF NOT EXISTS idx_udrzba_vozidlo ON public.vozidla_udrzba USING btree (vozidlo_id, datum_od DESC);
CREATE INDEX IF NOT EXISTS idx_vozidla_pracovnik ON public.vozidla USING btree (prideleny_pracovnik_id);
CREATE INDEX IF NOT EXISTS idx_vozidla_spz ON public.vozidla USING btree (spz);
CREATE INDEX IF NOT EXISTS idx_vozidla_stav ON public.vozidla USING btree (stav);

-- ============================================================================
-- SECTION 10: TRIGGERS
-- ============================================================================

CREATE OR REPLACE TRIGGER handle_updated_at BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE OR REPLACE TRIGGER on_stock_change AFTER INSERT OR DELETE OR UPDATE ON public.inventory_stock
    FOR EACH ROW EXECUTE FUNCTION public.update_inventory_item_total();

CREATE OR REPLACE TRIGGER trigger_generate_offer_number BEFORE INSERT ON public.nabidky
    FOR EACH ROW EXECUTE FUNCTION public.generate_offer_number();

CREATE OR REPLACE TRIGGER trigger_vozidla_updated_at BEFORE UPDATE ON public.vozidla
    FOR EACH ROW EXECUTE FUNCTION public.update_vozidla_updated_at();

CREATE OR REPLACE TRIGGER update_accounting_bank_accounts_updated_at BEFORE UPDATE ON public.accounting_bank_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_aml_cases_modtime BEFORE UPDATE ON public.aml_cases
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_aml_profiles_modtime BEFORE UPDATE ON public.aml_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 11: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on ALL tables
ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.akce ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_sanction_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_sanction_update_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bmw_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.klienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mzdy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nabidky ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nabidky_stavy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polozky_nabidky ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polozky_typy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pracovnici ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vozidla ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vozidla_udrzba ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vozidla_palivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_divisions ENABLE ROW LEVEL SECURITY;

-- =========================
-- Accounting RLS Policies
-- =========================

-- accounting_accounts
CREATE POLICY "Enable all access for service role" ON public.accounting_accounts TO service_role USING (true);
CREATE POLICY "Enable read access for authenticated users" ON public.accounting_accounts FOR SELECT TO authenticated USING (true);

-- accounting_bank_accounts
CREATE POLICY "Users can view bank accounts" ON public.accounting_bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update bank accounts" ON public.accounting_bank_accounts TO authenticated USING (true) WITH CHECK (true);

-- accounting_bank_movements
CREATE POLICY "Service role can manage bank movements" ON public.accounting_bank_movements TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users can view bank movements" ON public.accounting_bank_movements FOR SELECT TO authenticated USING (true);

-- accounting_contacts
CREATE POLICY "Enable all for authenticated users" ON public.accounting_contacts USING (auth.role() = 'authenticated');

-- accounting_documents
CREATE POLICY "Admins can manage documents" ON public.accounting_documents TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])));
CREATE POLICY "Enable all access for owners/admins" ON public.accounting_documents
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])));
CREATE POLICY "Enable read access for authenticated users" ON public.accounting_documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can view accounting documents" ON public.accounting_documents FOR SELECT TO authenticated USING (true);

-- accounting_journal
CREATE POLICY "Enable all access for service role" ON public.accounting_journal TO service_role USING (true);
CREATE POLICY "Enable read access for authenticated users" ON public.accounting_journal FOR SELECT TO authenticated USING (true);

-- accounting_mappings
CREATE POLICY "Enable all access for owners/admins" ON public.accounting_mappings
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])));
CREATE POLICY "Enable read access for authenticated users" ON public.accounting_mappings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage mappings" ON public.accounting_mappings TO authenticated USING (true);

-- accounting_providers
CREATE POLICY "Admins can manage accounting providers" ON public.accounting_providers TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])));
CREATE POLICY "Enable all access for owners/admins" ON public.accounting_providers
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])));
CREATE POLICY "Enable read access for authenticated users" ON public.accounting_providers FOR SELECT USING (auth.role() = 'authenticated');

-- accounting_sync_logs
CREATE POLICY "Admins can view logs" ON public.accounting_sync_logs FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])));
CREATE POLICY "Enable all access for owners/admins" ON public.accounting_sync_logs
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])));
CREATE POLICY "Enable read access for authenticated users" ON public.accounting_sync_logs FOR SELECT USING (auth.role() = 'authenticated');

-- =========================
-- Core Business RLS Policies
-- =========================

CREATE POLICY "Enable all for authenticated users" ON public.akce USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.divisions USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.finance USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.fixed_costs USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.klienti USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.mzdy USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.nabidky USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.nabidky_stavy USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.organization_members USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.organizations USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.polozky_nabidky USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.polozky_typy USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.prace USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.pracovnici USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.worker_divisions USING (auth.role() = 'authenticated');

-- profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- =========================
-- AML RLS Policies
-- =========================

CREATE POLICY "Enable all access for authenticated users" ON public.aml_alerts USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.aml_cases USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.aml_checks USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.aml_hits USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.aml_profiles USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert/update" ON public.aml_sanction_list_items USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON public.aml_sanction_list_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert logs" ON public.aml_sanction_update_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read logs" ON public.aml_sanction_update_logs FOR SELECT USING (auth.role() = 'authenticated');

-- =========================
-- Suppliers & Inventory RLS
-- =========================

CREATE POLICY "Enable all for authenticated users" ON public.suppliers USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.supplier_items USING (auth.role() = 'authenticated');

CREATE POLICY "Centers are viewable by everyone" ON public.inventory_centers FOR SELECT USING (true);
CREATE POLICY "Centers are insertable by authenticated users" ON public.inventory_centers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Centers are updatable by authenticated users" ON public.inventory_centers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Centers are deletable by authenticated users" ON public.inventory_centers FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view inventory" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can modify inventory" ON public.inventory_items TO authenticated USING (true);

CREATE POLICY "Stock is viewable by everyone" ON public.inventory_stock FOR SELECT USING (true);
CREATE POLICY "Stock is insertable by authenticated users" ON public.inventory_stock FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Stock is updatable by authenticated users" ON public.inventory_stock FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view movements" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create movements" ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (true);

-- =========================
-- Fleet RLS Policies
-- =========================

CREATE POLICY "Enable all for authenticated users" ON public.vozidla USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.vozidla_udrzba USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.vozidla_palivo USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON public.bmw_oauth_states USING (auth.role() = 'authenticated');

-- =========================
-- Currency Rates RLS
-- =========================

CREATE POLICY "Enable all for authenticated users" ON public.currency_rates USING (auth.role() = 'authenticated');

-- ============================================================================
-- SECTION 12: AUTH TRIGGER (new user → profiles)
-- ============================================================================

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SECTION 13: STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('nabidky-assets', 'nabidky-assets', true),
  ('inventory-images', 'inventory-images', true),
  ('vozidla-doklady', 'vozidla-doklady', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: nabidky-assets (public read, authenticated write)
DO $$ BEGIN
  CREATE POLICY "Public read nabidky-assets" ON storage.objects FOR SELECT USING (bucket_id = 'nabidky-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated upload nabidky-assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'nabidky-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated update nabidky-assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'nabidky-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated delete nabidky-assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'nabidky-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage policies: inventory-images (public read, authenticated write)
DO $$ BEGIN
  CREATE POLICY "Public read inventory-images" ON storage.objects FOR SELECT USING (bucket_id = 'inventory-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated upload inventory-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'inventory-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated update inventory-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'inventory-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated delete inventory-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'inventory-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage policies: vozidla-doklady (authenticated only)
DO $$ BEGIN
  CREATE POLICY "Authenticated read vozidla-doklady" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vozidla-doklady');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated upload vozidla-doklady" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vozidla-doklady');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- SECTION 14: SEED DATA
-- ============================================================================

-- Default organization for single-tenant deployment
INSERT INTO public.organizations (id, name, slug)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'Default Organization', 'default')
ON CONFLICT (id) DO NOTHING;

-- Offer statuses
INSERT INTO public.nabidky_stavy (nazev, color, poradi) VALUES
  ('Rozpracováno', '#94a3b8', 1),
  ('Odesláno', '#3b82f6', 2),
  ('Schváleno', '#22c55e', 3),
  ('Zamítnuto', '#ef4444', 4),
  ('Archivováno', '#6b7280', 5)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Done!
-- ============================================================================
