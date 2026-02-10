-- Přidání sloupce pro řazení položek nabídky (drag & drop)
ALTER TABLE public.polozky_nabidky ADD COLUMN IF NOT EXISTS poradi integer DEFAULT 0;

-- Backfill: stávající položky dostanou pořadí dle ID
UPDATE public.polozky_nabidky SET poradi = id WHERE poradi = 0;

-- Index pro rychlé řazení položek v rámci nabídky
CREATE INDEX IF NOT EXISTS idx_polozky_nabidky_poradi ON public.polozky_nabidky(nabidka_id, poradi);
