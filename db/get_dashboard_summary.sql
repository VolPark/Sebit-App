-- Function to calculate dashboard summary for a given period and filters
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
    start_date DATE,
    end_date DATE,
    p_pracovnik_id BIGINT DEFAULT NULL,
    p_klient_id BIGINT DEFAULT NULL
)
RETURNS JSONB
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
                    m.rok = DATE_PART('year', v_month_start) AND
                    m.mesic = DATE_PART('month', v_month_start)
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
                    WHERE m.rok = DATE_PART('year', v_month_start) AND m.mesic = DATE_PART('month', v_month_start)
                )
                SELECT COALESCE(SUM(p.pocet_hodin * whr.rate), 0), COALESCE(SUM(p.pocet_hodin), 0)
                INTO m_total_labor_cost, m_total_hours
                FROM public.prace p
                JOIN worker_hourly_rate whr ON p.pracovnik_id = whr.pracovnik_id
                WHERE p.datum BETWEEN v_month_start AND v_month_end
                  AND p.klient_id = p_klient_id
                  AND (p_pracovnik_id IS NULL OR p.pracovnik_id = p_pracovnik_id);
            END IF; -- End IF p_klient_id IS NULL for monthly data

            m_month_name := CASE DATE_PART('month', v_month_start)
                WHEN 1 THEN 'Led' WHEN 2 THEN 'Úno' WHEN 3 THEN 'Bře' WHEN 4 THEN 'Dub'
                WHEN 5 THEN 'Kvě' WHEN 6 THEN 'Čvn' WHEN 7 THEN 'Čvc' WHEN 8 THEN 'Srp'
                WHEN 9 THEN 'Zář' WHEN 10 THEN 'Říj' WHEN 11 THEN 'Lis' WHEN 12 THEN 'Pro'
            END;

            v_monthly_data := jsonb_insert(v_monthly_data, '{999}', jsonb_build_object(
                'month', m_month_name,
                'year', DATE_PART('year', v_month_start),
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
                m.rok * 100 + m.mesic >= DATE_PART('year', start_date) * 100 + DATE_PART('month', start_date)
                AND m.rok * 100 + m.mesic <= DATE_PART('year', end_date) * 100 + DATE_PART('month', end_date)
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
            SELECT CEIL((end_date - start_date + 1) / 30.4375) INTO v_num_months_for_avg;
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
                    rok = DATE_PART('year', start_date)
                    AND (p_pracovnik_id IS NULL OR pracovnik_id = p_pracovnik_id);
                
                v_average_monthly_wage := CASE WHEN v_unique_employees_for_avg_wage > 0 THEN v_total_labor_cost / v_unique_employees_for_avg_wage ELSE 0 END;
            ELSIF DATE_PART('month', start_date) = 1 AND DATE_PART('month', end_date) = 12 AND DATE_PART('year', start_date) = DATE_PART('year', end_date) THEN
                -- Single year
                SELECT COUNT(DISTINCT pracovnik_id)
                INTO v_unique_employees_for_avg_wage
                FROM public.mzdy
                WHERE
                    rok = DATE_PART('year', start_date)
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