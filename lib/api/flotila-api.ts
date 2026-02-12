/**
 * SEBIT-app: Fleet (Flotila) Module
 * TypeScript types and API functions
 */

import { supabase } from '@/lib/supabase';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ module: 'Flotila API' });

// ============================================================================
// TYPES
// ============================================================================

export type StavVozidla = 'aktivni' | 'servis' | 'neaktivni' | 'vyrazeno';
export type TypPaliva = 'benzin' | 'diesel' | 'elektro' | 'hybrid_plugin' | 'hybrid' | 'cng' | 'lpg';
export type TypUdrzby = 'pravidelny_servis' | 'oprava' | 'stk' | 'pneumatiky' | 'nehoda' | 'jine';

export interface Vozidlo {
  id: number;
  organization_id: string;

  // Vehicle Identification
  vin: string;
  spz: string;
  znacka: string;
  model: string;
  rok_vyroby: number;
  typ_paliva: TypPaliva;
  barva: string | null;

  // Operational Data
  stav: StavVozidla;
  najezd_km: number;
  prideleny_pracovnik_id: number | null;

  // Insurance & Inspection
  pojisteni_do: string | null;
  pojistovna: string | null;
  stk_do: string | null;
  emisni_kontrola_do: string | null;

  // Purchase
  datum_porizeni: string | null;
  kupni_cena: number | null;
  leasing: boolean;
  leasing_mesicni_splatka: number | null;
  leasing_do: string | null;

  // BMW CarData
  bmw_cardata_aktivni: boolean;
  bmw_client_id: string | null;
  bmw_refresh_token: string | null;
  bmw_access_token: string | null;
  bmw_token_expiry: string | null;

  // Czech Vehicle Registry data (RSV Datová kostka)
  vin_data: Record<string, unknown> | null;
  vin_data_fetched_at: string | null;

  // Metadata
  poznamka: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Client-safe vehicle type (excludes OAuth tokens)
 * Used for client-side queries to prevent credential exposure
 */
export type VozidloClientSafe = Omit<Vozidlo, 'bmw_client_id' | 'bmw_refresh_token' | 'bmw_access_token' | 'bmw_token_expiry'>;

export interface VozidloSRelacemi extends VozidloClientSafe {
  prideleny_pracovnik?: {
    id: number;
    jmeno: string;
  } | null;
  posledni_udrzba?: VozidloUdrzba | null;
  statistiky?: {
    celkove_naklady_udrzba: number;
    celkove_naklady_palivo: number;
    prumerna_spotreba: number;
  };
}

export interface VozidloUdrzba {
  id: number;
  vozidlo_id: number;
  typ: TypUdrzby;
  popis: string;
  servisni_partner: string | null;
  datum_od: string;
  datum_do: string | null;
  najezd_pri_udrzbe: number | null;
  naklady: number | null;
  mena: string;
  faktura_url: string | null;
  poznamka: string | null;
  created_at: string;
}

export interface VozidloPalivo {
  id: number;
  vozidlo_id: number;
  ridic_id: number | null;
  datum: string;
  najezd_km: number;
  litry: number;
  cena_za_litr: number | null;
  celkova_cena: number | null;
  mena: string;
  plna_nadrz: boolean;
  typ_paliva: string | null;
  cerpadlo: string | null;
  poznamka: string | null;
  created_at: string;

  // Relations
  ridic?: { id: number; jmeno: string } | null;
}

export interface FleetStats {
  celkem_vozidel: number;
  aktivnich: number;
  v_servisu: number;
  brzy_stk: number;
  brzy_pojisteni: number;
  celkova_hodnota: number;
  mesicni_naklady_leasing: number;
}

// Form types
export interface VozidloFormData {
  vin: string;
  spz: string;
  znacka: string;
  model: string;
  rok_vyroby: number;
  typ_paliva: TypPaliva;
  barva?: string;
  najezd_km: number;
  prideleny_pracovnik_id?: number;
  pojisteni_do?: string;
  pojistovna?: string;
  stk_do?: string;
  datum_porizeni?: string;
  kupni_cena?: number;
  leasing?: boolean;
  poznamka?: string;
  vin_data?: Record<string, unknown>;
  vin_data_fetched_at?: string;
}

// ============================================================================
// API FUNCTIONS: Vehicles
// ============================================================================

/**
 * Get all vehicles with optional filters
 * NOTE: Explicitly excludes BMW OAuth tokens for security
 */
export const getVozidla = async (filters?: {
  stav?: StavVozidla;
  hledani?: string;
}): Promise<VozidloSRelacemi[]> => {
  // Explicitly select fields to exclude BMW tokens
  let query = supabase
    .from('vozidla')
    .select(`
      id,
      organization_id,
      vin,
      spz,
      znacka,
      model,
      rok_vyroby,
      typ_paliva,
      barva,
      stav,
      najezd_km,
      prideleny_pracovnik_id,
      pojisteni_do,
      pojistovna,
      stk_do,
      emisni_kontrola_do,
      datum_porizeni,
      kupni_cena,
      leasing,
      leasing_mesicni_splatka,
      leasing_do,
      bmw_cardata_aktivni,
      poznamka,
      created_at,
      updated_at,
      prideleny_pracovnik:pracovnici!prideleny_pracovnik_id(id, jmeno)
    `)
    .order('spz', { ascending: true });

  if (filters?.stav) {
    query = query.eq('stav', filters.stav);
  }

  if (filters?.hledani) {
    // Sanitize search input to prevent SQL-like injections (though Supabase parameterizes)
    const sanitized = filters.hledani.replace(/[%_]/g, '\\$&');
    query = query.or(`spz.ilike.%${sanitized}%,znacka.ilike.%${sanitized}%,model.ilike.%${sanitized}%,vin.ilike.%${sanitized}%`);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching vozidla', { error: error.message });
    throw error;
  }

  // TypeScript doesn't infer Supabase foreign key joins correctly, so we use unknown intermediate
  return data as unknown as VozidloSRelacemi[];
};

/**
 * Get single vehicle by ID
 * NOTE: Explicitly excludes BMW OAuth tokens for security
 */
export const getVozidlo = async (id: number): Promise<VozidloSRelacemi | null> => {
  const { data, error } = await supabase
    .from('vozidla')
    .select(`
      id,
      organization_id,
      vin,
      spz,
      znacka,
      model,
      rok_vyroby,
      typ_paliva,
      barva,
      stav,
      najezd_km,
      prideleny_pracovnik_id,
      pojisteni_do,
      pojistovna,
      stk_do,
      emisni_kontrola_do,
      datum_porizeni,
      kupni_cena,
      leasing,
      leasing_mesicni_splatka,
      leasing_do,
      bmw_cardata_aktivni,
      vin_data,
      vin_data_fetched_at,
      poznamka,
      created_at,
      updated_at,
      prideleny_pracovnik:pracovnici!prideleny_pracovnik_id(id, jmeno)
    `)
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Error fetching vozidlo', { id, error: error.message });
    throw error;
  }

  // TypeScript doesn't infer Supabase foreign key joins correctly, so we use unknown intermediate
  return data as unknown as VozidloSRelacemi;
};

/**
 * Create new vehicle
 */
export const createVozidlo = async (vozidlo: VozidloFormData): Promise<Vozidlo> => {
  const { data, error } = await supabase
    .from('vozidla')
    .insert([vozidlo])
    .select()
    .single();

  if (error) {
    logger.error('Error creating vozidlo', { error: error.message });
    throw error;
  }

  return data as Vozidlo;
};

/**
 * Update vehicle
 */
export const updateVozidlo = async (id: number, updates: Partial<VozidloFormData>): Promise<Vozidlo> => {
  const { data, error } = await supabase
    .from('vozidla')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating vozidlo', { id, error: error.message });
    throw error;
  }

  return data as Vozidlo;
};

/**
 * Delete vehicle
 */
export const deleteVozidlo = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('vozidla')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Error deleting vozidlo', { id, error: error.message });
    throw error;
  }
};

// ============================================================================
// API FUNCTIONS: Maintenance
// ============================================================================

/**
 * Get maintenance records for vehicle
 */
export const getUdrzba = async (vozidloId: number): Promise<VozidloUdrzba[]> => {
  const { data, error } = await supabase
    .from('vozidla_udrzba')
    .select('*')
    .eq('vozidlo_id', vozidloId)
    .order('datum_od', { ascending: false });

  if (error) {
    logger.error('Error fetching udrzba', { vozidloId, error: error.message });
    throw error;
  }

  return data as VozidloUdrzba[];
};

/**
 * Add maintenance record
 */
export const addUdrzba = async (udrzba: Omit<VozidloUdrzba, 'id' | 'created_at'>): Promise<VozidloUdrzba> => {
  const { data, error } = await supabase
    .from('vozidla_udrzba')
    .insert([udrzba])
    .select()
    .single();

  if (error) {
    logger.error('Error adding udrzba', { vozidloId: udrzba.vozidlo_id, error: error.message });
    throw error;
  }

  return data as VozidloUdrzba;
};

// ============================================================================
// API FUNCTIONS: Fuel Logs
// ============================================================================

/**
 * Get fuel logs for vehicle
 */
export const getPalivoLogs = async (vozidloId: number, limit = 50): Promise<VozidloPalivo[]> => {
  const { data, error } = await supabase
    .from('vozidla_palivo')
    .select(`
      *,
      ridic:pracovnici!ridic_id(id, jmeno)
    `)
    .eq('vozidlo_id', vozidloId)
    .order('datum', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Error fetching palivo logs', { vozidloId, error: error.message });
    throw error;
  }

  return data as VozidloPalivo[];
};

/**
 * Add fuel log
 */
export const addPalivoLog = async (log: Omit<VozidloPalivo, 'id' | 'created_at' | 'ridic'>): Promise<VozidloPalivo> => {
  const { data, error } = await supabase
    .from('vozidla_palivo')
    .insert([log])
    .select()
    .single();

  if (error) {
    logger.error('Error adding palivo log', { vozidloId: log.vozidlo_id, error: error.message });
    throw error;
  }

  return data as VozidloPalivo;
};

// ============================================================================
// API FUNCTIONS: Statistics
// ============================================================================

/**
 * Get fleet statistics
 */
export const getFleetStats = async (): Promise<FleetStats> => {
  const { data: vozidla, error } = await supabase
    .from('vozidla')
    .select('stav, kupni_cena, leasing_mesicni_splatka, stk_do, pojisteni_do');

  if (error) {
    logger.error('Error fetching fleet stats', { error: error.message });
    throw error;
  }

  const celkem_vozidel = vozidla.length;
  const aktivnich = vozidla.filter(v => v.stav === 'aktivni').length;
  const v_servisu = vozidla.filter(v => v.stav === 'servis').length;

  const today = new Date();
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);

  const brzy_stk = vozidla.filter(v =>
    v.stk_do && new Date(v.stk_do) <= in30Days && new Date(v.stk_do) >= today
  ).length;

  const brzy_pojisteni = vozidla.filter(v =>
    v.pojisteni_do && new Date(v.pojisteni_do) <= in30Days && new Date(v.pojisteni_do) >= today
  ).length;

  const celkova_hodnota = vozidla.reduce((sum, v) => sum + (v.kupni_cena || 0), 0);
  const mesicni_naklady_leasing = vozidla.reduce((sum, v) => sum + (v.leasing_mesicni_splatka || 0), 0);

  return {
    celkem_vozidel,
    aktivnich,
    v_servisu,
    brzy_stk,
    brzy_pojisteni,
    celkova_hodnota,
    mesicni_naklady_leasing,
  };
};
