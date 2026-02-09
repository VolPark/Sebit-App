-- Přidání sloupce pro editovatelný úvodní text nabídky v PDF
-- Pokud je NULL, použije se výchozí text v aplikaci
ALTER TABLE public.nabidky ADD COLUMN IF NOT EXISTS uvodni_text text;
