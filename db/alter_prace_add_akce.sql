-- 1) Přidat sloupec akce_id (pokud neexistuje)
ALTER TABLE public.prace
  ADD COLUMN IF NOT EXISTS akce_id bigint NULL;

-- 2) Přidat FK constraint pouze pokud neexistuje (bez chyby při opětovném spuštění)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prace_akce_fk'
  ) THEN
    ALTER TABLE public.prace
      ADD CONSTRAINT prace_akce_fk FOREIGN KEY (akce_id)
        REFERENCES public.akce(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
  END IF;
END
$$;

-- 3) Index pro rychlé filtrování podle akce
CREATE INDEX IF NOT EXISTS idx_prace_akce_id ON public.prace (akce_id);

-- Poznámky:
-- - Po spuštění ověřte v Supabase konzoli, že FK a index existují.
-- - Pokud používáte RLS, nezapomeňte přidat/přizpůsobit politiky pro INSERT/UPDATE/SELECT/DELETE.
-- - Pokud chcete, doplním i skript pro backfill akce_id ze specifických pravidel (např. podle klienta+datumu).
