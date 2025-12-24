-- Run these queries in Supabase SQL Editor to get the full schema details.
-- You can run them all at once, or one by one.

-- 1. INDEXY (Indexes)
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 2. FUNKCE A PROCEDURY (Functions)
SELECT
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS args,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname NOT LIKE 'git_%' -- Exclude internal git functions if any
ORDER BY function_name;

-- 3. RLS POLICIES (Security)
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. TRIGGERS
SELECT
    event_object_table as table_name,
    trigger_name,
    event_manipulation as event,
    action_statement as definition,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY table_name, trigger_name;

-- 5. COMPUTED COLUMNS (Generated columns details)
SELECT
    table_name,
    column_name,
    generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
AND is_generated = 'ALWAYS'
ORDER BY table_name;
