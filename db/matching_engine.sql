-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1. Token Match Helper Function
CREATE OR REPLACE FUNCTION calculate_token_match(query text, target text) 
RETURNS float IMMUTABLE LANGUAGE plpgsql AS $$
DECLARE
  q_tokens text[];
  t_tokens text[];
  overlap_count int;
  q_len int;
BEGIN
  -- Split into tokens, lowercase + unaccent
  q_tokens := string_to_array(trim(lower(unaccent(query))), ' ');
  t_tokens := string_to_array(trim(lower(unaccent(target))), ' ');
  
  -- Filter empty tokens
  SELECT array_agg(x) INTO q_tokens FROM unnest(q_tokens) x WHERE length(x) > 0;
  SELECT array_agg(x) INTO t_tokens FROM unnest(t_tokens) x WHERE length(x) > 0;
  
  q_len := array_length(q_tokens, 1);
  IF q_len IS NULL OR q_len = 0 THEN RETURN 0; END IF;
  
  -- Count overlapping tokens
  SELECT count(*) INTO overlap_count 
  FROM unnest(q_tokens) q
  WHERE q = ANY(t_tokens);
  
  RETURN overlap_count::float / q_len::float;
END;
$$;

-- 2. Main Matching RPC Function
DROP FUNCTION IF EXISTS match_parties(text, float, date, text);

CREATE OR REPLACE FUNCTION match_parties (
  query_name text,
  similarity_threshold float default 0.4,
  query_birth_date date default null,
  query_country text default null
) RETURNS TABLE (
  id uuid,
  name text,
  list_name text,
  external_id text,
  birth_dates jsonb,
  citizenships jsonb,
  details jsonb, -- Added details column
  similarity float,
  matched_alias text,
  match_details jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH matched_items AS (
      -- 1. Match on Main Name
      SELECT
        item.id,
        item.name::text,
        item.list_name::text,
        item.external_id::text,
        item.details->'birthDates' as birth_dates, -- Fix key: birthDates
        item.details->'citizenships' as citizenships, -- Fix key: citizenships
        item.details, 
        GREATEST(
            similarity(item.name, query_name), 
            calculate_token_match(query_name, item.name)
        )::float AS base_sim,
        NULL::text as alias_hit
      FROM
        public.aml_sanction_list_items item
      WHERE
        (item.name % query_name OR similarity(item.name, query_name) > 0.1) 
      
      UNION ALL
      
      -- 2. Match on Aliases
      SELECT
        item.id,
        item.name::text,
        item.list_name::text,
        item.external_id::text,
        item.details->'birthDates' as birth_dates, -- Fix key: birthDates
        item.details->'citizenships' as citizenships, -- Fix key: citizenships
        item.details, 
        GREATEST(
            similarity(alias_obj->>'wholeName', query_name),
            calculate_token_match(query_name, alias_obj->>'wholeName')
        )::float AS base_sim,
        (alias_obj->>'wholeName')::text as alias_hit
      FROM
        public.aml_sanction_list_items item,
        jsonb_array_elements(item.details -> 'nameAliases') alias_obj
      WHERE
        ((alias_obj->>'wholeName') % query_name OR similarity(alias_obj->>'wholeName', query_name) > 0.1)
  )
  SELECT
      mi.id,
      mi.name,
      mi.list_name,
      mi.external_id,
      mi.birth_dates,
      mi.citizenships,
      mi.details,
      LEAST(1.0, 
        (MAX(mi.base_sim) * 0.90) + 
        -- Boost for DOB (+25% Exact, +10% Year)
        MAX(CASE 
            WHEN query_birth_date IS NOT NULL AND mi.birth_dates IS NOT NULL THEN
                CASE 
                    -- Check exact match (date field in object)
                    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(mi.birth_dates) bd_obj WHERE bd_obj->>'date' = to_char(query_birth_date, 'YYYY-MM-DD')) THEN 0.25
                    -- Check year match (date field in object)
                    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(mi.birth_dates) bd_obj WHERE left(bd_obj->>'date', 4) = to_char(query_birth_date, 'YYYY')) THEN 0.10
                    ELSE 0
                END
            ELSE 0 
        END) +
        -- Boost for Country (+15%)
        MAX(CASE
            WHEN query_country IS NOT NULL AND mi.citizenships IS NOT NULL THEN
                CASE
                    -- Check Country ISO
                    WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(mi.citizenships) c_obj WHERE c_obj->>'countryIso' = query_country) THEN 0.15
                    ELSE 0
                END
            ELSE 0
        END)
      ) as similarity,
      MAX(mi.alias_hit) as matched_alias,
      jsonb_build_object(
          'base_score', MAX(mi.base_sim),
          'dob_boost', MAX(CASE WHEN query_birth_date IS NOT NULL AND mi.birth_dates IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(mi.birth_dates) bd_obj WHERE bd_obj->>'date' = to_char(query_birth_date, 'YYYY-MM-DD')) THEN 0.25 ELSE 0 END),
          'country_boost', MAX(CASE WHEN query_country IS NOT NULL AND mi.citizenships IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(mi.citizenships) c_obj WHERE c_obj->>'countryIso' = query_country) THEN 0.15 ELSE 0 END)
      ) as match_details
  FROM matched_items mi
  WHERE mi.base_sim >= similarity_threshold
  GROUP BY mi.id, mi.name, mi.list_name, mi.external_id, mi.birth_dates, mi.citizenships, mi.details
  ORDER BY similarity DESC
  LIMIT 20;
END;
$$;
