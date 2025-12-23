-- 1. Clean up confusing/legacy columns
ALTER TABLE polozky_nabidky DROP COLUMN IF EXISTS celkova_cena;
ALTER TABLE polozky_nabidky DROP COLUMN IF EXISTS cena_jednotkova;
ALTER TABLE polozky_nabidky DROP COLUMN IF EXISTS konfigurace;

-- 2. Add the correct calculated column 'celkem'
ALTER TABLE polozky_nabidky 
ADD COLUMN IF NOT EXISTS celkem NUMERIC GENERATED ALWAYS AS (COALESCE(mnozstvi, 0) * COALESCE(cena_ks, 0)) STORED;

-- 3. Force Refresh
NOTIFY pgrst, 'reload schema';

-- 4. Verify
SELECT id, nazev, mnozstvi, cena_ks, celkem FROM polozky_nabidky LIMIT 5;
