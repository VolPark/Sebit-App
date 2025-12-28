-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.akce (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nazev text NOT NULL,
  datum date NOT NULL,
  klient_id bigint,
  cena_klient numeric NOT NULL DEFAULT 0,
  material_klient numeric NOT NULL DEFAULT 0,
  material_my numeric NOT NULL DEFAULT 0,
  odhad_hodin numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_completed boolean DEFAULT false,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  division_id bigint,
  CONSTRAINT akce_pkey PRIMARY KEY (id),
  CONSTRAINT akce_klient_fk FOREIGN KEY (klient_id) REFERENCES public.klienti(id),
  CONSTRAINT akce_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT akce_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id)
);
CREATE TABLE public.app_admins (
  user_id uuid NOT NULL,
  CONSTRAINT app_admins_pkey PRIMARY KEY (user_id),
  CONSTRAINT app_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.divisions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nazev text NOT NULL,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT divisions_pkey PRIMARY KEY (id),
  CONSTRAINT divisions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.finance (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  datum date DEFAULT CURRENT_DATE,
  typ text CHECK (typ = ANY (ARRAY['Příjem'::text, 'Výdej'::text])),
  castka numeric,
  poznamka text,
  popis text,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  division_id bigint,
  CONSTRAINT finance_pkey PRIMARY KEY (id),
  CONSTRAINT finance_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT finance_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id)
);
CREATE TABLE public.fixed_costs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nazev text NOT NULL,
  castka numeric NOT NULL DEFAULT 0,
  rok integer NOT NULL,
  mesic integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  division_id bigint,
  CONSTRAINT fixed_costs_pkey PRIMARY KEY (id),
  CONSTRAINT fixed_costs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT fixed_costs_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id)
);
CREATE TABLE public.klienti (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nazev text NOT NULL,
  sazba numeric,
  email text,
  poznamka text,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  CONSTRAINT klienti_pkey PRIMARY KEY (id),
  CONSTRAINT klienti_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.mzdy (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  pracovnik_id bigint,
  mesic integer NOT NULL,
  rok integer NOT NULL,
  hruba_mzda numeric,
  faktura numeric,
  priplatek numeric,
  created_at timestamp with time zone DEFAULT now(),
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  celkova_castka numeric DEFAULT ((COALESCE(hruba_mzda, (0)::numeric) + COALESCE(faktura, (0)::numeric)) + COALESCE(priplatek, (0)::numeric)),
  CONSTRAINT mzdy_pkey PRIMARY KEY (id),
  CONSTRAINT mzdy_pracovnik_id_fkey FOREIGN KEY (pracovnik_id) REFERENCES public.pracovnici(id),
  CONSTRAINT mzdy_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.nabidky (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  nazev text NOT NULL,
  klient_id bigint,
  celkova_cena numeric DEFAULT 0,
  stav text DEFAULT 'rozpracováno'::text,
  poznamka text,
  akce_id bigint,
  stav_id bigint,
  cislo text,
  platnost_do date,
  division_id bigint,
  CONSTRAINT nabidky_pkey PRIMARY KEY (id),
  CONSTRAINT nabidky_klient_id_fkey FOREIGN KEY (klient_id) REFERENCES public.klienti(id),
  CONSTRAINT nabidky_akce_id_fkey FOREIGN KEY (akce_id) REFERENCES public.akce(id),
  CONSTRAINT nabidky_stav_id_fkey FOREIGN KEY (stav_id) REFERENCES public.nabidky_stavy(id),
  CONSTRAINT nabidky_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id)
);
CREATE TABLE public.nabidky_stavy (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nazev text NOT NULL,
  color text,
  poradi integer DEFAULT 0,
  CONSTRAINT nabidky_stavy_pkey PRIMARY KEY (id)
);
CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organization_members_pkey PRIMARY KEY (id),
  CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.polozky_nabidky (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nabidka_id bigint,
  nazev text NOT NULL,
  typ text DEFAULT 'produkt'::text,
  mnozstvi numeric DEFAULT 1,
  cena_ks numeric DEFAULT 0,
  celkem numeric DEFAULT (COALESCE(mnozstvi, (0)::numeric) * COALESCE(cena_ks, (0)::numeric)),
  popis text,
  obrazek_url text,
  sazba_dph numeric DEFAULT 21,
  CONSTRAINT polozky_nabidky_pkey PRIMARY KEY (id),
  CONSTRAINT polozky_nabidky_nabidka_id_fkey FOREIGN KEY (nabidka_id) REFERENCES public.nabidky(id)
);
CREATE TABLE public.polozky_typy (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nazev text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT polozky_typy_pkey PRIMARY KEY (id)
);
CREATE TABLE public.prace (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  datum date DEFAULT CURRENT_DATE,
  popis text,
  pocet_hodin numeric,
  klient_id bigint,
  pracovnik_id bigint,
  akce_id bigint,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  division_id bigint,
  CONSTRAINT prace_pkey PRIMARY KEY (id),
  CONSTRAINT prace_klient_id_fkey FOREIGN KEY (klient_id) REFERENCES public.klienti(id),
  CONSTRAINT prace_pracovnik_id_fkey FOREIGN KEY (pracovnik_id) REFERENCES public.pracovnici(id),
  CONSTRAINT prace_akce_fk FOREIGN KEY (akce_id) REFERENCES public.akce(id),
  CONSTRAINT prace_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT prace_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id)
);
CREATE TABLE public.pracovnici (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  jmeno text NOT NULL,
  hodinova_mzda numeric,
  telefon text,
  is_active boolean DEFAULT true,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  user_id uuid,
  CONSTRAINT pracovnici_pkey PRIMARY KEY (id),
  CONSTRAINT pracovnici_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT pracovnici_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'reporter'::app_role,
  full_name text CHECK (char_length(full_name) >= 3),
  updated_at timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.worker_divisions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  worker_id bigint,
  division_id bigint,
  organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT worker_divisions_pkey PRIMARY KEY (id),
  CONSTRAINT worker_divisions_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.pracovnici(id),
  CONSTRAINT worker_divisions_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id),
  CONSTRAINT worker_divisions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- ==========================================
-- 2. INDEXES
-- ==========================================

CREATE INDEX idx_akce_datum ON public.akce USING btree (datum);
CREATE INDEX idx_akce_klient ON public.akce USING btree (klient_id);
CREATE INDEX idx_akce_klient_org ON public.akce USING btree (organization_id, klient_id);

CREATE INDEX idx_finance_organization_id ON public.finance USING btree (organization_id);

CREATE INDEX idx_fixed_costs_org_rok_mesic ON public.fixed_costs USING btree (organization_id, rok, mesic);

CREATE INDEX idx_klienti_org_id_slozeny ON public.klienti USING btree (organization_id, id);

CREATE UNIQUE INDEX mzdy_pracovnik_id_mesic_rok_key ON public.mzdy USING btree (pracovnik_id, mesic, rok);

CREATE UNIQUE INDEX organization_members_org_user_key ON public.organization_members USING btree (organization_id, user_id);
CREATE UNIQUE INDEX organization_members_organization_id_user_id_key ON public.organization_members USING btree (organization_id, user_id);

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);

CREATE INDEX idx_polozky_nabidky_nabidka_id ON public.polozky_nabidky USING btree (nabidka_id);

CREATE UNIQUE INDEX polozky_typy_nazev_key ON public.polozky_typy USING btree (nazev);

CREATE INDEX idx_prace_akce_id ON public.prace USING btree (akce_id);
CREATE INDEX idx_prace_datum ON public.prace USING btree (datum);
CREATE INDEX idx_prace_klient_org ON public.prace USING btree (organization_id, klient_id);
CREATE INDEX idx_prace_org_datum ON public.prace USING btree (organization_id, datum DESC);
CREATE INDEX idx_prace_pracovnik_org ON public.prace USING btree (organization_id, pracovnik_id);

CREATE INDEX idx_pracovnici_org_id_slozeny ON public.pracovnici USING btree (organization_id, id);

-- ==========================================
-- 3. TRIGGERS
-- ==========================================

-- Trigger: trigger_generate_offer_number on nabidky
-- Definition: EXECUTE FUNCTION generate_offer_number()
-- Timing: BEFORE INSERT
-- (Requires function definition below)

-- ==========================================
-- 4. FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.generate_offer_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  year_val INT;
  max_seq INT;
  new_seq INT;
BEGIN
  -- Determine year (use NEW.created_at if set, otherwise NOW)
  year_val := EXTRACT(YEAR FROM COALESCE(NEW.created_at, NOW()));
  
  -- Find max sequence for this year
  SELECT COALESCE(MAX(SPLIT_PART(cislo, '/', 2)::INT), 0)
  INTO max_seq
  FROM nabidky
  WHERE cislo LIKE 'N' || year_val || '/%';

  new_seq := max_seq + 1;

  -- Set the formatted number
  NEW.cislo := 'N' || year_val || '/' || LPAD(new_seq::text, 4, '0');
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(start_date date, end_date date, p_pracovnik_id bigint DEFAULT NULL::bigint, p_klient_id bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_total_revenue NUMERIC := 0;
    v_total_material_cost NUMERIC := 0;
    v_total_material_klient NUMERIC := 0;
    v_material_profit NUMERIC := 0;
    v_total_estimated_hours NUMERIC := 0;
    v_total_labor_cost NUMERIC := 0;
    v_total_hours NUMERIC := 0;
    v_avg_company_rate NUMERIC := 0;
    v_average_hourly_wage NUMERIC := 0;
    v_average_monthly_wage NUMERIC := 0;
    v_estimated_vs_actual_hours_ratio NUMERIC := 0;
    v_top_clients JSONB;
    v_top_workers JSONB;
    v_monthly_data JSONB := '[]';
    
    v_mzdy_filtered JSONB;
    v_prace_filtered JSONB;

    v_current_month DATE;
    v_month_start DATE;
    v_month_end DATE;

    -- Monthly loop variables
    m_total_revenue NUMERIC;
    m_total_material_cost NUMERIC;
    m_total_material_klient NUMERIC;
    m_material_profit NUMERIC;
    m_total_estimated_hours NUMERIC;
    m_total_labor_cost NUMERIC;
    m_total_hours NUMERIC;
    m_month_name TEXT;

    v_num_months_for_avg NUMERIC := 0; -- To calculate average monthly wage for multi-month range
    v_unique_employees_for_avg_wage BIGINT;

BEGIN
    -- Initialize aggregated variables for the entire period
    v_total_revenue := 0;
    v_total_material_cost := 0;
    v_total_material_klient := 0;
    v_material_profit := 0;
    v_total_estimated_hours := 0;
    v_total_labor_cost := 0;
    v_total_hours := 0;

    -- 1. Calculate Monthly Data if the date range implies multiple months (e.g., last 12 months)
    -- This condition checks if the range starts at the beginning of a month and ends at the end of a month
    -- and covers more than one month.
    IF (start_date = date_trunc('month', start_date) AND end_date = date_trunc('month', end_date) + interval '1 month - 1 day') AND (end_date - start_date + 1 > 31) THEN
        v_current_month := date_trunc('month', start_date);
        WHILE v_current_month <= date_trunc('month', end_date) LOOP
            v_month_start := v_current_month;
            v_month_end := (v_current_month + interval '1 month - 1 day');

            m_total_revenue := 0;
            m_total_material_cost := 0;
            m_total_material_klient := 0;
            m_material_profit := 0;
            m_total_estimated_hours := 0;
            m_total_labor_cost := 0;
            m_total_hours := 0;

            -- --- Revenue & Material Costs for current month ---
            SELECT
                COALESCE(SUM(a.cena_klient), 0),
                COALESCE(SUM(a.material_my), 0),
                COALESCE(SUM(a.material_klient), 0),
                COALESCE(SUM(a.material_klient - a.material_my), 0),
                COALESCE(SUM(a.odhad_hodin), 0)
            INTO
                m_total_revenue,
                m_total_material_cost,
                m_total_material_klient,
                m_material_profit,
                m_total_estimated_hours
            FROM
                public.akce AS a
            WHERE
                a.datum BETWEEN v_month_start AND v_month_end
                AND (p_klient_id IS NULL OR a.klient_id = p_klient_id);

            -- --- Labor Costs & Hours for current month ---
            IF p_klient_id IS NULL THEN
                -- No client filter: simple aggregation of mzdy and prace
                SELECT
                    COALESCE(SUM(m.celkova_castka), 0)
                INTO
                    m_total_labor_cost
                FROM
                    public.mzdy AS m
                WHERE
                    m.rok = EXTRACT(YEAR FROM v_month_start)
                    AND m.mesic = EXTRACT(MONTH FROM v_month_start)
                    AND (p_pracovnik_id IS NULL OR m.pracovnik_id = p_pracovnik_id);

                SELECT
                    COALESCE(SUM(p.pocet_hodin), 0)
                INTO
                    m_total_hours
                FROM
                    public.prace AS p
                WHERE
                    p.datum BETWEEN v_month_start AND v_month_end
                    AND (p_pracovnik_id IS NULL OR p.pracovnik_id = p_pracovnik_id);
            ELSE
                -- Client filter is active: calculate prorated labor cost for the month using JOINs
                WITH worker_monthly_hours AS (
                    SELECT p.pracovnik_id, SUM(p.pocet_hodin) as total_hours
                    FROM public.prace p
                    WHERE p.datum BETWEEN v_month_start AND v_month_end
                    GROUP BY p.pracovnik_id
                ),
                worker_hourly_rate AS (
                    SELECT m.pracovnik_id, (m.celkova_castka / NULLIF(wmh.total_hours, 0)) as rate
                    FROM public.mzdy m
                    JOIN worker_monthly_hours wmh ON m.pracovnik_id = wmh.pracovnik_id
                    WHERE m.rok = EXTRACT(YEAR FROM v_month_start) AND m.mesic = EXTRACT(MONTH FROM v_month_start)
                )
                SELECT COALESCE(SUM(p.pocet_hodin * whr.rate), 0), COALESCE(SUM(p.pocet_hodin), 0)
                INTO m_total_labor_cost, m_total_hours
                FROM public.prace p
                JOIN worker_hourly_rate whr ON p.pracovnik_id = whr.pracovnik_id
                WHERE p.datum BETWEEN v_month_start AND v_month_end
                  AND p.klient_id = p_klient_id
                  AND (p_pracovnik_id IS NULL OR p.pracovnik_id = p_pracovnik_id);
            END IF; -- End IF p_klient_id IS NULL for monthly data

            m_month_name := CASE EXTRACT(MONTH FROM v_month_start)
                WHEN 1 THEN 'Led' WHEN 2 THEN 'Úno' WHEN 3 THEN 'Bře' WHEN 4 THEN 'Dub'
                WHEN 5 THEN 'Kvě' WHEN 6 THEN 'Čvn' WHEN 7 THEN 'Čvc' WHEN 8 THEN 'Srp'
                WHEN 9 THEN 'Zář' WHEN 10 THEN 'Říj' WHEN 11 THEN 'Lis' WHEN 12 THEN 'Pro'
            END;

            v_monthly_data := jsonb_insert(v_monthly_data, '{999}', jsonb_build_object(
                'month', m_month_name,
                'year', EXTRACT(YEAR FROM v_month_start),
                'totalRevenue', m_total_revenue,
                'totalCosts', m_total_material_cost + m_total_labor_cost,
                'grossProfit', m_total_revenue - (m_total_material_cost + m_total_labor_cost),
                'totalHours', m_total_hours,
                'materialProfit', m_material_profit,
                'totalMaterialKlient', m_total_material_klient,
                'totalLaborCost', m_total_labor_cost,
                'totalEstimatedHours', m_total_estimated_hours
            ), TRUE);

            -- Aggregate into overall summary variables
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
        -- 2. Overall Aggregations (if not calculating monthly data, or for single month/year)
        -- Revenue & Material Costs from 'akce'
        SELECT
            COALESCE(SUM(a.cena_klient), 0),
            COALESCE(SUM(a.material_my), 0),
            COALESCE(SUM(a.material_klient), 0),
            COALESCE(SUM(a.material_klient - a.material_my), 0),
            COALESCE(SUM(a.odhad_hodin), 0)
        INTO
            v_total_revenue,
            v_total_material_cost,
            v_total_material_klient,
            v_material_profit,
            v_total_estimated_hours
        FROM
            public.akce AS a
        WHERE
            a.datum BETWEEN start_date AND end_date
            AND (p_klient_id IS NULL OR a.klient_id = p_klient_id);

        -- Labor Costs & Hours
        IF p_klient_id IS NULL THEN
            -- No client filter: simple aggregation of mzdy and prace
            SELECT
                COALESCE(SUM(m.celkova_castka), 0)
            INTO
                v_total_labor_cost
            FROM
                public.mzdy AS m
            WHERE
                m.rok * 100 + m.mesic >= EXTRACT(YEAR FROM start_date) * 100 + EXTRACT(MONTH FROM start_date)
                AND m.rok * 100 + m.mesic <= EXTRACT(YEAR FROM end_date) * 100 + EXTRACT(MONTH FROM end_date)
                AND (p_pracovnik_id IS NULL OR m.pracovnik_id = p_pracovnik_id);

            SELECT
                COALESCE(SUM(p.pocet_hodin), 0)
            INTO
                v_total_hours
            FROM
                public.prace AS p
            WHERE
                p.datum BETWEEN start_date AND end_date
                AND (p_pracovnik_id IS NULL OR p.pracovnik_id = p_pracovnik_id)
                AND (p_klient_id IS NULL OR p.klient_id = p_klient_id);
        ELSE
            -- Client filter is active: calculate prorated labor cost
            WITH worker_period_hours AS (
                SELECT p.pracovnik_id, p.rok_mesic, SUM(p.pocet_hodin) as total_hours
                FROM (SELECT *, to_char(datum, 'YYYY-MM') as rok_mesic FROM public.prace) p
                WHERE p.datum BETWEEN start_date AND end_date
                GROUP BY p.pracovnik_id, p.rok_mesic
            ),
            worker_hourly_rate AS (
                SELECT m.pracovnik_id, to_char(make_date(m.rok, m.mesic, 1), 'YYYY-MM') as rok_mesic, (m.celkova_castka / NULLIF(wph.total_hours, 0)) as rate
                FROM public.mzdy m
                JOIN worker_period_hours wph ON m.pracovnik_id = wph.pracovnik_id AND to_char(make_date(m.rok, m.mesic, 1), 'YYYY-MM') = wph.rok_mesic
            )
            SELECT COALESCE(SUM(p.pocet_hodin * whr.rate), 0), COALESCE(SUM(p.pocet_hodin), 0)
            INTO v_total_labor_cost, v_total_hours
            FROM (SELECT *, to_char(datum, 'YYYY-MM') as rok_mesic FROM public.prace) p
            JOIN worker_hourly_rate whr ON p.pracovnik_id = whr.pracovnik_id AND p.rok_mesic = whr.rok_mesic
            WHERE p.datum BETWEEN start_date AND end_date
              AND p.klient_id = p_klient_id
              AND (p_pracovnik_id IS NULL OR p.pracovnik_id = p_pracovnik_id);
        END IF; -- End IF p_klient_id IS NULL for overall data
        
        -- Determine num_months_for_avg if not in monthly data loop
        IF v_num_months_for_avg = 0 THEN
            SELECT CEIL(EXTRACT(DAY FROM (end_date - start_date + 1)) / 30.4375) INTO v_num_months_for_avg;
            IF v_num_months_for_avg < 1 THEN v_num_months_for_avg := 1; END IF;
        END IF;
    END IF; -- End IF monthly data calculation block


    -- Derived Metrics (common for both monthly loop and single period)
    DECLARE
        v_total_costs NUMERIC := v_total_material_cost + v_total_labor_cost;
        v_gross_profit NUMERIC := v_total_revenue - v_total_costs;
    BEGIN
        v_avg_company_rate := CASE WHEN v_total_hours > 0 THEN (v_total_revenue - v_total_material_klient) / v_total_hours ELSE 0 END;
        v_average_hourly_wage := CASE WHEN v_total_hours > 0 THEN v_total_labor_cost / v_total_hours ELSE 0 END;
        
        -- Calculate average monthly wage based on the context
        IF p_klient_id IS NULL THEN -- Only calculate if no client filter
            IF start_date = date_trunc('month', start_date) AND end_date = date_trunc('month', end_date) + interval '1 month - 1 day' THEN
                -- Single month
                SELECT COUNT(DISTINCT pracovnik_id)
                INTO v_unique_employees_for_avg_wage
                FROM public.mzdy
                WHERE
                    rok = EXTRACT(YEAR FROM start_date)
                    AND mesic = EXTRACT(MONTH FROM start_date)
                    AND (p_pracovnik_id IS NULL OR pracovnik_id = p_pracovnik_id);
                
                v_average_monthly_wage := CASE WHEN v_unique_employees_for_avg_wage > 0 THEN v_total_labor_cost / v_unique_employees_for_avg_wage ELSE 0 END;
            ELSIF EXTRACT(MONTH FROM start_date) = 1 AND EXTRACT(MONTH FROM end_date) = 12 AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM end_date) THEN
                -- Single year
                SELECT COUNT(DISTINCT pracovnik_id)
                INTO v_unique_employees_for_avg_wage
                FROM public.mzdy
                WHERE
                    rok = EXTRACT(YEAR FROM start_date)
                    AND (p_pracovnik_id IS NULL OR pracovnik_id = p_pracovnik_id);
                
                v_average_monthly_wage := CASE WHEN v_unique_employees_for_avg_wage > 0 THEN (v_total_labor_cost / v_unique_employees_for_avg_wage) / 12 ELSE 0 END;
            ELSE
                -- Multi-month range (e.g., last 12 months)
                v_average_monthly_wage := CASE WHEN v_num_months_for_avg > 0 THEN v_total_labor_cost / v_num_months_for_avg ELSE 0 END;
            END IF;
        ELSE
            v_average_monthly_wage := 0; -- Not applicable with client filter
        END IF;

        v_estimated_vs_actual_hours_ratio := CASE WHEN v_total_estimated_hours > 0 THEN v_total_hours / v_total_estimated_hours ELSE 0 END;
    END;

    -- Top Clients
    SELECT
        COALESCE(jsonb_agg(jsonb_build_object(
            'klient_id', a.klient_id,
            'nazev', k.nazev,
            'total', COALESCE(SUM(a.cena_klient), 0)
        ) ORDER BY COALESCE(SUM(a.cena_klient), 0) DESC), '[]'::jsonb)
    INTO
        v_top_clients
    FROM
        public.akce AS a
    LEFT JOIN
        public.klienti AS k ON a.klient_id = k.id
    WHERE
        a.datum BETWEEN start_date AND end_date
        AND (p_klient_id IS NULL OR a.klient_id = p_klient_id)
    GROUP BY
        a.klient_id, k.nazev
    LIMIT 5;

    -- Top Workers
    SELECT
        COALESCE(jsonb_agg(jsonb_build_object(
            'pracovnik_id', p.pracovnik_id,
            'jmeno', pr.jmeno,
            'total', COALESCE(SUM(p.pocet_hodin), 0)
        ) ORDER BY COALESCE(SUM(p.pocet_hodin), 0) DESC), '[]'::jsonb)
    INTO
        v_top_workers
    FROM
        public.prace AS p
    LEFT JOIN
        public.pracovnici AS pr ON p.pracovnik_id = pr.id
    WHERE
        p.datum BETWEEN start_date AND end_date
        AND (p_pracovnik_id IS NULL OR p.pracovnik_id = p_pracovnik_id)
        AND (p_klient_id IS NULL OR p.klient_id = p_klient_id)
    GROUP BY
        p.pracovnik_id, pr.jmeno
    LIMIT 5;


    -- Construct and return the final JSONB object
    RETURN jsonb_build_object(
        'totalRevenue', v_total_revenue,
        'totalCosts', (v_total_material_cost + v_total_labor_cost),
        'grossProfit', (v_total_revenue - (v_total_material_cost + v_total_labor_cost)),
        'materialProfit', v_material_profit,
        'totalHours', v_total_hours,
        'avgCompanyRate', v_avg_company_rate,
        'averageHourlyWage', v_average_hourly_wage,
        'averageMonthlyWage', v_average_monthly_wage,
        'estimatedVsActualHoursRatio', v_estimated_vs_actual_hours_ratio,
        'topClients', v_top_clients,
        'topWorkers', v_top_workers,
        'monthlyData', v_monthly_data,
        'prevPeriod', jsonb_build_object('totalRevenue', 0, 'totalCosts', 0, 'grossProfit', 0) -- Placeholder
    );

END;
$function$;

-- ==========================================
-- 5. RLS POLICIES
-- ==========================================

-- Policy: Users can delete their organization's fixed costs on fixed_costs
-- Qual: (organization_id IN ( SELECT organization_members.organization_id FROM organization_members WHERE (organization_members.user_id = auth.uid())))

-- Policy: Users can insert their organization's fixed costs on fixed_costs
-- With Check: (organization_id IN ( SELECT organization_members.organization_id FROM organization_members WHERE (organization_members.user_id = auth.uid())))

-- Policy: Users can update their organization's fixed costs on fixed_costs
-- Qual: (organization_id IN ( SELECT organization_members.organization_id FROM organization_members WHERE (organization_members.user_id = auth.uid())))

-- Policy: Users can view their organization's fixed costs on fixed_costs
-- Qual: (organization_id IN ( SELECT organization_members.organization_id FROM organization_members WHERE (organization_members.user_id = auth.uid())))

-- Policy: Enable all access for authenticated users on nabidky
-- Qual: true

-- Policy: Enable all for authenticated users on nabidky
-- Qual: (auth.role() = 'authenticated'::text)

-- Policy: Enable all access for authenticated users on polozky_nabidky
-- Qual: true

-- Policy: Enable all access for items on polozky_nabidky
-- Qual: true

-- Policy: Enable all for authenticated users on polozky_nabidky
-- Qual: (auth.role() = 'authenticated'::text)

-- Policy: Enable all access for authenticated users on polozky_typy
-- Qual: true

-- Policy: Enable insert access for all users on polozky_typy
-- Qual: true (INSERT)

-- Policy: Enable read access for all users on polozky_typy
-- Qual: true (SELECT)

-- ==========================================
-- 6. STORAGE
-- ==========================================

-- Bucket: offer-images
-- Public: true

-- Policy: Allow All Public Access offer-images
-- ON storage.objects
-- FOR ALL
-- TO public
-- USING (bucket_id = 'offer-images')
-- WITH CHECK (bucket_id = 'offer-images');

