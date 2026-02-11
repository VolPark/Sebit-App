-- Migrace: Rozšířené klientské údaje + zobrazení v nabídkách
-- Datum: 2026-02-11

-- Nové sloupce v tabulce klienti
ALTER TABLE klienti ADD COLUMN IF NOT EXISTS kontaktni_osoba text;
ALTER TABLE klienti ADD COLUMN IF NOT EXISTS telefon text;
ALTER TABLE klienti ADD COLUMN IF NOT EXISTS web text;

-- Nové sloupce v tabulce nabidky pro výběr zobrazení klientských údajů v PDF
ALTER TABLE nabidky ADD COLUMN IF NOT EXISTS zobrazeni_klienta text DEFAULT 'zakladni';
ALTER TABLE nabidky ADD COLUMN IF NOT EXISTS zobrazeni_klienta_pole jsonb;
