-- ============================================================================
-- SEBIT-app: Fleet (Flotila) Module - Database Schema
-- ============================================================================

-- Enum: Vehicle Status
DO $$ BEGIN
  CREATE TYPE stav_vozidla AS ENUM ('aktivni', 'servis', 'neaktivni', 'vyrazeno');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum: Fuel Type
DO $$ BEGIN
  CREATE TYPE typ_paliva AS ENUM ('benzin', 'diesel', 'elektro', 'hybrid_plugin', 'hybrid', 'cng', 'lpg');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Main Vehicles Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS vozidla (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',

  -- Vehicle Identification
  vin varchar(17) NOT NULL UNIQUE,
  spz varchar(20) NOT NULL UNIQUE,
  znacka varchar(100) NOT NULL,
  model varchar(100) NOT NULL,
  rok_vyroby smallint NOT NULL,
  typ_paliva typ_paliva NOT NULL,
  barva varchar(50),

  -- Operational Data
  stav stav_vozidla NOT NULL DEFAULT 'aktivni',
  najezd_km integer DEFAULT 0,
  prideleny_pracovnik_id bigint REFERENCES pracovnici(id) ON DELETE SET NULL,

  -- Insurance & Technical Inspection
  pojisteni_do date,
  pojistovna varchar(255),
  stk_do date,
  emisni_kontrola_do date,

  -- Purchase/Lease
  datum_porizeni date,
  kupni_cena numeric(10,2),
  leasing boolean DEFAULT false,
  leasing_mesicni_splatka numeric(10,2),
  leasing_do date,

  -- BMW CarData Integration (Optional)
  bmw_cardata_aktivni boolean DEFAULT false,
  bmw_client_id varchar(255),
  bmw_refresh_token text,
  bmw_access_token text,
  bmw_token_expiry timestamptz,

  -- Notes
  poznamka text,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Maintenance Records
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE typ_udrzby AS ENUM ('pravidelny_servis', 'oprava', 'stk', 'pneumatiky', 'nehoda', 'jine');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS vozidla_udrzba (
  id bigserial PRIMARY KEY,
  vozidlo_id bigint NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,

  typ typ_udrzby NOT NULL,
  popis text NOT NULL,
  servisni_partner varchar(255),

  datum_od date NOT NULL,
  datum_do date,
  najezd_pri_udrzbe integer,

  naklady numeric(10,2),
  mena varchar(3) DEFAULT 'CZK',
  faktura_url text,

  poznamka text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Fuel Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS vozidla_palivo (
  id bigserial PRIMARY KEY,
  vozidlo_id bigint NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,
  ridic_id bigint REFERENCES pracovnici(id) ON DELETE SET NULL,

  datum date NOT NULL,
  najezd_km integer NOT NULL,
  litry numeric(6,2) NOT NULL,
  cena_za_litr numeric(6,2),
  celkova_cena numeric(8,2),
  mena varchar(3) DEFAULT 'CZK',

  plna_nadrz boolean DEFAULT true,
  typ_paliva varchar(50),
  cerpadlo varchar(255),

  poznamka text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_vozidla_stav ON vozidla(stav);
CREATE INDEX IF NOT EXISTS idx_vozidla_pracovnik ON vozidla(prideleny_pracovnik_id);
CREATE INDEX IF NOT EXISTS idx_vozidla_spz ON vozidla(spz);

CREATE INDEX IF NOT EXISTS idx_udrzba_vozidlo ON vozidla_udrzba(vozidlo_id, datum_od DESC);
CREATE INDEX IF NOT EXISTS idx_palivo_vozidlo ON vozidla_palivo(vozidlo_id, datum DESC);

-- ============================================================================
-- Triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_vozidla_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vozidla_updated_at ON vozidla;
CREATE TRIGGER trigger_vozidla_updated_at
  BEFORE UPDATE ON vozidla
  FOR EACH ROW
  EXECUTE FUNCTION update_vozidla_updated_at();
