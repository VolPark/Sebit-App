-- Globální procentuální sleva na nabídku
ALTER TABLE public.nabidky ADD COLUMN IF NOT EXISTS sleva_procenta numeric DEFAULT 0;

-- Příznak pro slevové položky (vizuální odlišení)
ALTER TABLE public.polozky_nabidky ADD COLUMN IF NOT EXISTS je_sleva boolean DEFAULT false;
