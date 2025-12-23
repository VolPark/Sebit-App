-- Ensure column exists (idempotent)
ALTER TABLE polozky_nabidky ADD COLUMN IF NOT EXISTS cena_ks NUMERIC DEFAULT 0;
ALTER TABLE polozky_nabidky ADD COLUMN IF NOT EXISTS mnozstvi NUMERIC DEFAULT 1;

-- Re-apply the generated column if needed (can be tricky to check existence, so we just attempt strict drop/create if this was a fresh failed install)
-- But safe bet is just ensuring the real columns exist.

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';

-- Verify structure
SELECT * FROM polozky_nabidky LIMIT 1;
