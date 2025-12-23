-- Enable RLS on the table
ALTER TABLE polozky_nabidky ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows everything (for now, to fix the error)
-- You can restrict this later to authenticated users only if needed
DROP POLICY IF EXISTS "Enable all access for items" ON polozky_nabidky;

CREATE POLICY "Enable all access for items" ON polozky_nabidky
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Verify it works by inserting a dummy (rollback after)
-- BEGIN;
-- INSERT INTO polozky_nabidky (nabidka_id, nazev, typ, mnozstvi, cena_ks) 
-- VALUES ((SELECT id FROM nabidky LIMIT 1), 'Test Item', 'ostatni', 1, 100);
-- ROLLBACK;
