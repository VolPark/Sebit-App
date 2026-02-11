-- SCHEMA EXTRACTED FROM DUMP
-- CONTAINS PUBLIC SCHEMA AND EXTENSIONS

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.0


--



--



--



--



--



--



--



--



--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--



--



--



--



--



--



--



--



--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.app_role AS ENUM (
    'owner',
    'admin',
    'office',
    'reporter'
);


ALTER TYPE public.app_role OWNER TO postgres;

--



--



--



--



--



--



--



--


--



--



--


--



--


--

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;



--


--
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;



--


--
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;



--


--
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;



--
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;



--
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;



--


--

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;



--
-- Name: generate_offer_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_offer_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.generate_offer_number() OWNER TO postgres;

--
-- Name: get_dashboard_summary(date, date, bigint, bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_dashboard_summary(start_date date, end_date date, p_pracovnik_id bigint DEFAULT NULL::bigint, p_klient_id bigint DEFAULT NULL::bigint) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.get_dashboard_summary(start_date date, end_date date, p_pracovnik_id bigint, p_klient_id bigint) OWNER TO postgres;

--
-- Name: get_profiles_roles(uuid[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_profiles_roles(user_ids uuid[]) RETURNS TABLE(id uuid, role public.app_role)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select id, role 
  from public.profiles 
  where id = any(user_ids);
$$;


ALTER FUNCTION public.get_profiles_roles(user_ids uuid[]) OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'reporter')
  on conflict (id) do nothing; -- Handle existing profiles
  return new;
end;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin')
  );
end;
$$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;



--
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;



--



--
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;



--
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;



--
    $_$;



--



--



--
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;



--
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;



--



--
$$;



--
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;



--
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;



--
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;



--
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;



--
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;



--
    end if;
    return new;
end;
$$;



--
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;



--
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;



--
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;



--
$$;



--
$_$;



--
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;



--
END
$$;



--
END;
$_$;



--
END;
$_$;



--
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;



--
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;



--
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;



--
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;



--
    END IF;
    RETURN NEW;
END;
$$;



--
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;



--
END;
$$;



--
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;



--
    RETURN NEW;
END;
$$;



--
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;



--
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;



--
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;



--
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;



--
    RETURN NEW; 
END;
$$;





--



--


--



--


--



--


--


--



--


--



--


--



--


--



--


--


--



--



--


--



--



--



--



--


--



--


--



--


--



--


--



--


--



--


--


--


--


--



--


--



--


--


--



--


--


--
-- Name: accounting_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounting_documents (
    id bigint NOT NULL,
    provider_id bigint,
    external_id text NOT NULL,
    type text NOT NULL,
    number text,
    supplier_name text,
    supplier_ico text,
    amount numeric,
    currency text DEFAULT 'CZK'::text,
    issue_date date,
    due_date date,
    tax_date date,
    description text,
    status text,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.accounting_documents OWNER TO postgres;

--
-- Name: accounting_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.accounting_documents ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounting_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounting_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounting_mappings (
    id bigint NOT NULL,
    document_id bigint,
    akce_id bigint,
    pracovnik_id bigint,
    division_id bigint,
    cost_category text,
    amount numeric NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.accounting_mappings OWNER TO postgres;

--
-- Name: accounting_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.accounting_mappings ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounting_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounting_providers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounting_providers (
    id bigint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    is_enabled boolean DEFAULT false,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.accounting_providers OWNER TO postgres;

--
-- Name: accounting_providers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.accounting_providers ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounting_providers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounting_sync_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounting_sync_logs (
    id bigint NOT NULL,
    provider_id bigint,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    status text,
    records_processed integer DEFAULT 0,
    error_message text
);


ALTER TABLE public.accounting_sync_logs OWNER TO postgres;

--
-- Name: accounting_sync_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.accounting_sync_logs ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounting_sync_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: akce; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.akce (
    id bigint NOT NULL,
    nazev text NOT NULL,
    datum date NOT NULL,
    klient_id bigint,
    cena_klient numeric(12,2) DEFAULT 0 NOT NULL,
    material_klient numeric(12,2) DEFAULT 0 NOT NULL,
    material_my numeric(12,2) DEFAULT 0 NOT NULL,
    odhad_hodin numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_completed boolean DEFAULT false,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    division_id bigint,
    project_type text DEFAULT 'STANDARD'::text
);


ALTER TABLE public.akce OWNER TO postgres;

--
-- Name: akce_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.akce ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.akce_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_admins (
    user_id uuid NOT NULL
);


ALTER TABLE public.app_admins OWNER TO postgres;

--
-- Name: divisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.divisions (
    id bigint NOT NULL,
    nazev text NOT NULL,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.divisions OWNER TO postgres;

--
-- Name: divisions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.divisions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.divisions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: finance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.finance (
    id bigint NOT NULL,
    datum date DEFAULT CURRENT_DATE,
    typ text,
    castka numeric,
    poznamka text,
    popis text,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    division_id bigint,
    akce_id bigint,
    variable_symbol text,
    invoice_number text,
    due_date date,
    supplier_ico text,
    supplier_name text,
    payment_method text DEFAULT 'Bank'::text,
    category text,
    CONSTRAINT finance_typ_check CHECK ((typ = ANY (ARRAY['Příjem'::text, 'Výdej'::text])))
);


ALTER TABLE public.finance OWNER TO postgres;

--
-- Name: COLUMN finance.variable_symbol; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.finance.variable_symbol IS 'Variabilní symbol (VS)';


--
-- Name: COLUMN finance.invoice_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.finance.invoice_number IS 'Číslo faktury / dokladu';


--
-- Name: COLUMN finance.supplier_ico; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.finance.supplier_ico IS 'IČO dodavatele (pro výdaje)';


--
-- Name: finance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.finance ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.finance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fixed_costs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixed_costs (
    id bigint NOT NULL,
    nazev text NOT NULL,
    castka numeric DEFAULT 0 NOT NULL,
    rok integer NOT NULL,
    mesic integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    division_id bigint
);


ALTER TABLE public.fixed_costs OWNER TO postgres;

--
-- Name: fixed_costs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.fixed_costs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.fixed_costs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: klienti; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.klienti (
    id bigint NOT NULL,
    nazev text NOT NULL,
    sazba numeric,
    email text,
    poznamka text,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    ico text,
    dic text,
    address text
);


ALTER TABLE public.klienti OWNER TO postgres;

--
-- Name: klienti_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.klienti ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.klienti_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mzdy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mzdy (
    id bigint NOT NULL,
    pracovnik_id bigint,
    mesic integer NOT NULL,
    rok integer NOT NULL,
    hruba_mzda numeric,
    faktura numeric,
    priplatek numeric,
    created_at timestamp with time zone DEFAULT now(),
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    celkova_castka numeric GENERATED ALWAYS AS (((COALESCE(hruba_mzda, (0)::numeric) + COALESCE(faktura, (0)::numeric)) + COALESCE(priplatek, (0)::numeric))) STORED
);


ALTER TABLE public.mzdy OWNER TO postgres;

--
-- Name: mzdy_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.mzdy ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.mzdy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: nabidky; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nabidky (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
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
    sleva_procenta numeric DEFAULT 0,
    uvodni_text text
);


ALTER TABLE public.nabidky OWNER TO postgres;

--
-- Name: nabidky_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.nabidky ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.nabidky_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: nabidky_stavy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nabidky_stavy (
    id bigint NOT NULL,
    nazev text NOT NULL,
    color text,
    poradi integer DEFAULT 0
);


ALTER TABLE public.nabidky_stavy OWNER TO postgres;

--
-- Name: nabidky_stavy_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.nabidky_stavy ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.nabidky_stavy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT organization_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])))
);


ALTER TABLE public.organization_members OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: polozky_nabidky; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.polozky_nabidky (
    id bigint NOT NULL,
    nabidka_id bigint,
    nazev text NOT NULL,
    typ text DEFAULT 'produkt'::text,
    mnozstvi numeric DEFAULT 1,
    cena_ks numeric DEFAULT 0,
    celkem numeric GENERATED ALWAYS AS ((COALESCE(mnozstvi, (0)::numeric) * COALESCE(cena_ks, (0)::numeric))) STORED,
    popis text,
    obrazek_url text,
    sazba_dph numeric DEFAULT 21,
    poradi integer DEFAULT 0,
    je_sleva boolean DEFAULT false
);


ALTER TABLE public.polozky_nabidky OWNER TO postgres;

--
-- Name: polozky_nabidky_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.polozky_nabidky ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.polozky_nabidky_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: polozky_typy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.polozky_typy (
    id bigint NOT NULL,
    nazev text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.polozky_typy OWNER TO postgres;

--
-- Name: polozky_typy_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.polozky_typy ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.polozky_typy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prace; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prace (
    id bigint NOT NULL,
    datum date DEFAULT CURRENT_DATE,
    popis text,
    pocet_hodin numeric,
    klient_id bigint,
    pracovnik_id bigint,
    akce_id bigint,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    division_id bigint
);


ALTER TABLE public.prace OWNER TO postgres;

--
-- Name: prace_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.prace ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.prace_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pracovnici; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pracovnici (
    id bigint NOT NULL,
    jmeno text NOT NULL,
    hodinova_mzda numeric,
    telefon text,
    is_active boolean DEFAULT true,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    user_id uuid,
    role text
);


ALTER TABLE public.pracovnici OWNER TO postgres;

--
-- Name: pracovnici_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.pracovnici ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pracovnici_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role public.app_role DEFAULT 'reporter'::public.app_role NOT NULL,
    full_name text,
    updated_at timestamp with time zone,
    CONSTRAINT username_length CHECK ((char_length(full_name) >= 3))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: worker_divisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.worker_divisions (
    id bigint NOT NULL,
    worker_id bigint,
    division_id bigint,
    organization_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.worker_divisions OWNER TO postgres;

--
-- Name: worker_divisions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.worker_divisions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.worker_divisions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--



--



--



--


--



--


--



--



--



--



--


--



--



--



--



--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--
-- Name: accounting_documents accounting_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_documents
    ADD CONSTRAINT accounting_documents_pkey PRIMARY KEY (id);


--
-- Name: accounting_documents accounting_documents_provider_id_external_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_documents
    ADD CONSTRAINT accounting_documents_provider_id_external_id_key UNIQUE (provider_id, external_id);


--
-- Name: accounting_mappings accounting_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_mappings
    ADD CONSTRAINT accounting_mappings_pkey PRIMARY KEY (id);


--
-- Name: accounting_providers accounting_providers_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_providers
    ADD CONSTRAINT accounting_providers_code_key UNIQUE (code);


--
-- Name: accounting_providers accounting_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_providers
    ADD CONSTRAINT accounting_providers_pkey PRIMARY KEY (id);


--
-- Name: accounting_sync_logs accounting_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_sync_logs
    ADD CONSTRAINT accounting_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: akce akce_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.akce
    ADD CONSTRAINT akce_pkey PRIMARY KEY (id);


--
-- Name: app_admins app_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_admins
    ADD CONSTRAINT app_admins_pkey PRIMARY KEY (user_id);


--
-- Name: divisions divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);


--
-- Name: finance finance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finance
    ADD CONSTRAINT finance_pkey PRIMARY KEY (id);


--
-- Name: fixed_costs fixed_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_costs
    ADD CONSTRAINT fixed_costs_pkey PRIMARY KEY (id);


--
-- Name: klienti klienti_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.klienti
    ADD CONSTRAINT klienti_pkey PRIMARY KEY (id);


--
-- Name: mzdy mzdy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mzdy
    ADD CONSTRAINT mzdy_pkey PRIMARY KEY (id);


--
-- Name: mzdy mzdy_pracovnik_id_mesic_rok_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mzdy
    ADD CONSTRAINT mzdy_pracovnik_id_mesic_rok_key UNIQUE (pracovnik_id, mesic, rok);


--
-- Name: nabidky nabidky_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nabidky
    ADD CONSTRAINT nabidky_pkey PRIMARY KEY (id);


--
-- Name: nabidky_stavy nabidky_stavy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nabidky_stavy
    ADD CONSTRAINT nabidky_stavy_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_organization_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: polozky_nabidky polozky_nabidky_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.polozky_nabidky
    ADD CONSTRAINT polozky_nabidky_pkey PRIMARY KEY (id);


--
-- Name: polozky_typy polozky_typy_nazev_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.polozky_typy
    ADD CONSTRAINT polozky_typy_nazev_key UNIQUE (nazev);


--
-- Name: polozky_typy polozky_typy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.polozky_typy
    ADD CONSTRAINT polozky_typy_pkey PRIMARY KEY (id);


--
-- Name: prace prace_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prace
    ADD CONSTRAINT prace_pkey PRIMARY KEY (id);


--
-- Name: pracovnici pracovnici_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pracovnici
    ADD CONSTRAINT pracovnici_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: worker_divisions worker_divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.worker_divisions
    ADD CONSTRAINT worker_divisions_pkey PRIMARY KEY (id);


--
-- Name: worker_divisions worker_divisions_worker_id_division_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.worker_divisions
    ADD CONSTRAINT worker_divisions_worker_id_division_id_key UNIQUE (worker_id, division_id);


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--
-- Name: idx_akce_datum; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_akce_datum ON public.akce USING btree (datum);


--
-- Name: idx_akce_klient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_akce_klient ON public.akce USING btree (klient_id);


--
-- Name: idx_akce_klient_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_akce_klient_org ON public.akce USING btree (organization_id, klient_id);


--
-- Name: idx_finance_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_finance_organization_id ON public.finance USING btree (organization_id);


--
-- Name: idx_fixed_costs_org_rok_mesic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fixed_costs_org_rok_mesic ON public.fixed_costs USING btree (organization_id, rok, mesic);


--
-- Name: idx_klienti_org_id_slozeny; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_klienti_org_id_slozeny ON public.klienti USING btree (organization_id, id);


--
-- Name: idx_polozky_nabidky_nabidka_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_polozky_nabidky_nabidka_id ON public.polozky_nabidky USING btree (nabidka_id);


--
-- Name: idx_prace_akce_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prace_akce_id ON public.prace USING btree (akce_id);


--
-- Name: idx_prace_datum; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prace_datum ON public.prace USING btree (datum);


--
-- Name: idx_prace_klient_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prace_klient_org ON public.prace USING btree (organization_id, klient_id);


--
-- Name: idx_prace_org_datum; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prace_org_datum ON public.prace USING btree (organization_id, datum DESC);


--
-- Name: idx_prace_pracovnik_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prace_pracovnik_org ON public.prace USING btree (organization_id, pracovnik_id);


--
-- Name: idx_pracovnici_org_id_slozeny; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pracovnici_org_id_slozeny ON public.pracovnici USING btree (organization_id, id);


--
-- Name: idx_pracovnici_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pracovnici_user_id ON public.pracovnici USING btree (user_id);


--
-- Name: organization_members_org_user_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX organization_members_org_user_key ON public.organization_members USING btree (organization_id, user_id);


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--
-- Name: nabidky trigger_generate_offer_number; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_generate_offer_number BEFORE INSERT ON public.nabidky FOR EACH ROW EXECUTE FUNCTION public.generate_offer_number();


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--
-- Name: accounting_documents accounting_documents_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_documents
    ADD CONSTRAINT accounting_documents_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.accounting_providers(id);


--
-- Name: accounting_mappings accounting_mappings_akce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_mappings
    ADD CONSTRAINT accounting_mappings_akce_id_fkey FOREIGN KEY (akce_id) REFERENCES public.akce(id) ON DELETE SET NULL;


--
-- Name: accounting_mappings accounting_mappings_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_mappings
    ADD CONSTRAINT accounting_mappings_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL;


--
-- Name: accounting_mappings accounting_mappings_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_mappings
    ADD CONSTRAINT accounting_mappings_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.accounting_documents(id) ON DELETE CASCADE;


--
-- Name: accounting_mappings accounting_mappings_pracovnik_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_mappings
    ADD CONSTRAINT accounting_mappings_pracovnik_id_fkey FOREIGN KEY (pracovnik_id) REFERENCES public.pracovnici(id) ON DELETE SET NULL;


--
-- Name: accounting_sync_logs accounting_sync_logs_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounting_sync_logs
    ADD CONSTRAINT accounting_sync_logs_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.accounting_providers(id);


--
-- Name: akce akce_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.akce
    ADD CONSTRAINT akce_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: akce akce_klient_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.akce
    ADD CONSTRAINT akce_klient_fk FOREIGN KEY (klient_id) REFERENCES public.klienti(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: akce akce_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.akce
    ADD CONSTRAINT akce_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: app_admins app_admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_admins
    ADD CONSTRAINT app_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: divisions divisions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: finance finance_akce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finance
    ADD CONSTRAINT finance_akce_id_fkey FOREIGN KEY (akce_id) REFERENCES public.akce(id) ON DELETE SET NULL;


--
-- Name: finance finance_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finance
    ADD CONSTRAINT finance_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: finance finance_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.finance
    ADD CONSTRAINT finance_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: fixed_costs fixed_costs_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_costs
    ADD CONSTRAINT fixed_costs_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: fixed_costs fixed_costs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_costs
    ADD CONSTRAINT fixed_costs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: klienti klienti_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.klienti
    ADD CONSTRAINT klienti_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: mzdy mzdy_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mzdy
    ADD CONSTRAINT mzdy_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: mzdy mzdy_pracovnik_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mzdy
    ADD CONSTRAINT mzdy_pracovnik_id_fkey FOREIGN KEY (pracovnik_id) REFERENCES public.pracovnici(id) ON DELETE SET NULL;


--
-- Name: nabidky nabidky_akce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nabidky
    ADD CONSTRAINT nabidky_akce_id_fkey FOREIGN KEY (akce_id) REFERENCES public.akce(id);


--
-- Name: nabidky nabidky_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nabidky
    ADD CONSTRAINT nabidky_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: nabidky nabidky_klient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nabidky
    ADD CONSTRAINT nabidky_klient_id_fkey FOREIGN KEY (klient_id) REFERENCES public.klienti(id);


--
-- Name: nabidky nabidky_stav_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nabidky
    ADD CONSTRAINT nabidky_stav_id_fkey FOREIGN KEY (stav_id) REFERENCES public.nabidky_stavy(id);


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: polozky_nabidky polozky_nabidky_nabidka_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.polozky_nabidky
    ADD CONSTRAINT polozky_nabidky_nabidka_id_fkey FOREIGN KEY (nabidka_id) REFERENCES public.nabidky(id) ON DELETE CASCADE;


--
-- Name: prace prace_akce_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prace
    ADD CONSTRAINT prace_akce_fk FOREIGN KEY (akce_id) REFERENCES public.akce(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: prace prace_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prace
    ADD CONSTRAINT prace_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id);


--
-- Name: prace prace_klient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prace
    ADD CONSTRAINT prace_klient_id_fkey FOREIGN KEY (klient_id) REFERENCES public.klienti(id);


--
-- Name: prace prace_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prace
    ADD CONSTRAINT prace_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: prace prace_pracovnik_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prace
    ADD CONSTRAINT prace_pracovnik_id_fkey FOREIGN KEY (pracovnik_id) REFERENCES public.pracovnici(id);


--
-- Name: pracovnici pracovnici_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pracovnici
    ADD CONSTRAINT pracovnici_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: pracovnici pracovnici_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pracovnici
    ADD CONSTRAINT pracovnici_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: worker_divisions worker_divisions_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.worker_divisions
    ADD CONSTRAINT worker_divisions_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE CASCADE;


--
-- Name: worker_divisions worker_divisions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.worker_divisions
    ADD CONSTRAINT worker_divisions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: worker_divisions worker_divisions_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.worker_divisions
    ADD CONSTRAINT worker_divisions_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.pracovnici(id) ON DELETE CASCADE;


--


--


--


--


--


--


--

--

--

--

--

--

--

--

--

--

--

--

--

--

--

--

--
-- Name: accounting_providers Admins can manage accounting providers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage accounting providers" ON public.accounting_providers TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: accounting_documents Admins can manage documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage documents" ON public.accounting_documents TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: accounting_sync_logs Admins can view logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view logs" ON public.accounting_sync_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: profiles Admins/Owners can update all profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins/Owners can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin());


--
-- Name: profiles Admins/Owners can view all profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins/Owners can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());


--
-- Name: nabidky Enable all access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for authenticated users" ON public.nabidky TO authenticated USING (true) WITH CHECK (true);


--
-- Name: polozky_nabidky Enable all access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for authenticated users" ON public.polozky_nabidky TO authenticated USING (true) WITH CHECK (true);


--
-- Name: polozky_typy Enable all access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for authenticated users" ON public.polozky_typy TO authenticated USING (true) WITH CHECK (true);


--
-- Name: worker_divisions Enable all access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for authenticated users" ON public.worker_divisions TO authenticated USING (true);


--
-- Name: polozky_nabidky Enable all access for items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for items" ON public.polozky_nabidky USING (true) WITH CHECK (true);


--
-- Name: accounting_documents Enable all access for owners/admins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for owners/admins" ON public.accounting_documents USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: accounting_mappings Enable all access for owners/admins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for owners/admins" ON public.accounting_mappings USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: accounting_providers Enable all access for owners/admins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for owners/admins" ON public.accounting_providers USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: accounting_sync_logs Enable all access for owners/admins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all access for owners/admins" ON public.accounting_sync_logs USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: nabidky Enable all for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all for authenticated users" ON public.nabidky USING ((auth.role() = 'authenticated'::text));


--
-- Name: polozky_nabidky Enable all for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all for authenticated users" ON public.polozky_nabidky USING ((auth.role() = 'authenticated'::text));


--
-- Name: divisions Enable delete access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable delete access for authenticated users" ON public.divisions FOR DELETE TO authenticated USING (true);


--
-- Name: polozky_typy Enable insert access for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert access for all users" ON public.polozky_typy FOR INSERT WITH CHECK (true);


--
-- Name: divisions Enable insert access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert access for authenticated users" ON public.divisions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: polozky_typy Enable read access for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users" ON public.polozky_typy FOR SELECT USING (true);


--
-- Name: accounting_documents Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.accounting_documents FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: accounting_mappings Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.accounting_mappings FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: accounting_providers Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.accounting_providers FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: accounting_sync_logs Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.accounting_sync_logs FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: divisions Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.divisions FOR SELECT TO authenticated USING (true);


--
-- Name: worker_divisions Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for authenticated users" ON public.worker_divisions FOR SELECT TO authenticated USING (true);


--
-- Name: divisions Enable update access for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable update access for authenticated users" ON public.divisions FOR UPDATE TO authenticated USING (true);


--
-- Name: fixed_costs Users can delete their organization's fixed costs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their organization's fixed costs" ON public.fixed_costs USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: fixed_costs Users can insert their organization's fixed costs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their organization's fixed costs" ON public.fixed_costs WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: accounting_mappings Users can manage mappings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage mappings" ON public.accounting_mappings TO authenticated USING (true);


--
-- Name: profiles Users can read own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: fixed_costs Users can update their organization's fixed costs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their organization's fixed costs" ON public.fixed_costs USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: accounting_documents Users can view accounting documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view accounting documents" ON public.accounting_documents FOR SELECT TO authenticated USING (true);


--
-- Name: fixed_costs Users can view their organization's fixed costs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their organization's fixed costs" ON public.fixed_costs USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: accounting_documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.accounting_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_mappings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.accounting_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_providers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.accounting_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_sync_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.accounting_sync_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: divisions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: worker_divisions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.worker_divisions ENABLE ROW LEVEL SECURITY;

--

--


--

--

--

--

--

--

--

--

--

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--



--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--



--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--



--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--



--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--



--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--



--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--
-- Name: FUNCTION pg_reload_conf(); Type: ACL; Schema: pg_catalog; Owner: supabase_admin
--



--


--
-- Name: FUNCTION generate_offer_number(); Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: FUNCTION get_dashboard_summary(start_date date, end_date date, p_pracovnik_id bigint, p_klient_id bigint); Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: FUNCTION get_profiles_roles(user_ids uuid[]); Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--



--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--


--
-- Name: TABLE accounting_documents; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE accounting_documents_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE accounting_mappings; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE accounting_mappings_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE accounting_providers; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE accounting_providers_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE accounting_sync_logs; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE accounting_sync_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE akce; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE akce_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE app_admins; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE divisions; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE divisions_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE finance; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE finance_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE fixed_costs; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE fixed_costs_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE klienti; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE klienti_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE mzdy; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE mzdy_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE nabidky; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE nabidky_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE nabidky_stavy; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE nabidky_stavy_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE organization_members; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE organizations; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE polozky_nabidky; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE polozky_nabidky_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE polozky_typy; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE polozky_typy_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE prace; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE prace_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE pracovnici; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE pracovnici_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: TABLE worker_divisions; Type: ACL; Schema: public; Owner: postgres
--



--
-- Name: SEQUENCE worker_divisions_id_seq; Type: ACL; Schema: public; Owner: postgres
--



--


--


--


--


--


--


--


--


--


--


--


--


--


--


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--


--


--


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

