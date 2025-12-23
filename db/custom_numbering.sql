-- 1. Add Column
ALTER TABLE nabidky ADD COLUMN IF NOT EXISTS cislo TEXT;

-- 2. Backfill Existing Data
WITH numbered AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at) as seq,
    EXTRACT(YEAR FROM created_at) as year
  FROM nabidky
)
UPDATE nabidky n
SET cislo = 'N' || numbered.year || '/' || LPAD(numbered.seq::text, 3, '0')
FROM numbered
WHERE n.id = numbered.id;

-- 3. Create Trigger Function
CREATE OR REPLACE FUNCTION generate_offer_number()
RETURNS TRIGGER AS $$
DECLARE
  year_val INT;
  max_seq INT;
  new_seq INT;
BEGIN
  -- Determine year (use NEW.created_at if set, otherwise NOW)
  year_val := EXTRACT(YEAR FROM COALESCE(NEW.created_at, NOW()));
  
  -- Find max sequence for this year (parse from existing numbers N2024/xxx)
  -- We assume format N{YYYY}/{SEQ}
  SELECT COALESCE(MAX(SPLIT_PART(cislo, '/', 2)::INT), 0)
  INTO max_seq
  FROM nabidky
  WHERE cislo LIKE 'N' || year_val || '/%';

  new_seq := max_seq + 1;

  -- Set the formatted number
  NEW.cislo := 'N' || year_val || '/' || LPAD(new_seq::text, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger
DROP TRIGGER IF EXISTS trigger_generate_offer_number ON nabidky;
CREATE TRIGGER trigger_generate_offer_number
BEFORE INSERT ON nabidky
FOR EACH ROW
EXECUTE FUNCTION generate_offer_number();

-- 5. Force Refresh
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT id, created_at, cislo FROM nabidky ORDER BY created_at DESC LIMIT 5;
