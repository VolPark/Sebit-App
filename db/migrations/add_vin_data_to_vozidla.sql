-- Migrace: Kompletní VIN data z Czech Vehicle Registry API (dataovozidlech.cz)
-- Datum: 2026-02-12

-- JSONB sloupec pro kompletní raw response z RSV Datové kostky (70+ polí)
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS vin_data jsonb;

-- Timestamp posledního dotazu na API
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS vin_data_fetched_at timestamptz;
