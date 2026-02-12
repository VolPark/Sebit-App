/**
 * Czech Vehicle Registry API Client (Datová kostka RSV)
 * https://api.dataovozidlech.cz/api/vehicletechnicaldata/v2
 *
 * Provides access to official Czech vehicle registration data
 * including technical specs, STK dates, emissions, dimensions, etc.
 */

import { createLogger } from '@/lib/logger';
import { CompanyConfig } from '@/lib/companyConfig';
import { getErrorMessage } from '@/lib/errors';

const logger = createLogger({ module: 'CzechVehicleAPI' });

// Rate limit: 27 requests per minute per API key (from documentation)
const RATE_LIMIT = 27;
const RATE_WINDOW_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

export interface CzechVehicleApiResponse {
  Status: number;
  Data: CzechVehicleData | null;
}

export interface CzechVehicleData {
  // Identifikace vozidla
  VIN: string;
  TovarniZnacka: string;
  ObchodniOznaceni: string;
  Typ: string;
  Varianta: string | null;
  Verze: string | null;
  Kategorie: string;
  VozidloDruh: string;
  VozidloDruh2: string | null;

  // Výrobce
  VozidloVyrobce: string | null;
  MotorVyrobce: string | null;
  VyrobceKaroserie: string | null;

  // Motor
  Palivo: string;
  MotorZdvihObjem: number;
  MotorMaxVykon: string;
  MotorTyp: string;
  VozidloElektricke: string;
  VozidloHybridni: string;
  VozidloHybridniTrida: string | null;

  // Registrace a STK
  DatumPrvniRegistrace: string | null;
  DatumPrvniRegistraceVCr: string | null;
  CisloTypovehoSchvaleni: string | null;
  HomologaceEs: string | null;
  PravidelnaTechnickaProhlidkaDo: string | null;
  PredRegistraciProhlidkaDne: string | null;
  PredSchvalenimProhlidkaDne: string | null;
  EvidencniProhlidkaDne: string | null;
  HistorickeVozidloProhlidkaDne: string | null;

  // Status
  StatusNazev: string;
  ZarazeniVozidla: string;
  PocetVlastniku: number;
  PocetProvozovatelu: number;

  // Emise
  EmiseEHKOSNEHSES: string | null;
  EmisniUroven: string | null;
  EmiseKSA: number;
  EmiseCO2: string | null;
  EmiseCO2Specificke: string | null;
  EmiseSnizeniNedc: string | null;
  EmiseSnizeniWltp: string | null;

  // Spotřeba
  SpotrebaMetodika: string | null;
  SpotrebaNa100Km: string | null;
  Spotreba: string | null;
  SpotrebaEl: string | null;
  DojezdZR: string | null;

  // Karoserie
  KaroserieDruh: string | null;
  KaroserieVyrobniCislo: string | null;
  VozidloKaroserieBarva: string | null;
  VozidloKaroserieBarvaDoplnkova: string | null;
  VozidloKaroserieMist: string | null;

  // Rozměry a hmotnosti
  Rozmery: string | null;
  RozmeryRozvor: string | null;
  Rozchod: string | null;
  HmotnostiProvozni: number;
  HmotnostiPripPov: string | null;
  HmotnostiPripPovN: string | null;
  HmotnostiPripPovBrzdenePV: string | null;
  HmotnostiPripPovNebrzdenePV: string | null;
  HmotnostiPripPovJS: string | null;
  HmotnostiTestWltp: string | null;
  HmotnostUzitecneZatizeniPrumer: string | null;

  // Nápravy a pneumatiky
  NapravyPocetDruh: string | null;
  NapravyPneuRafky: string | null;

  // Hluk a rychlost
  HlukStojiciOtacky: string | null;
  HlukJizda: number;
  NejvyssiRychlost: number;
  PomerVykonHmotnost: number;

  // Technologie
  InovativniTechnologie: string | null;
  StupenDokonceni: string | null;
  FaktorOdchylkyDe: string | null;
  FaktorVerifikaceVf: string | null;

  // Další
  VozidloUcel: string | null;
  DalsiZaznamy: string | null;
  AlternativniProvedeni: string | null;
  VozidloSpojZarizNazev: string | null;

  // Doklady
  CisloTp: string | null;
  CisloOrv: string | null;
  OrvZadrzeno: boolean;
  OrvKeSkartaci: string | null;
  OrvOdevzdano: string | null;
  RzDruh: string | null;
  RzJkVydana: string | null;
  RzKeSkartaci: string | null;
  RzOdevzdano: string | null;
  RzZadrzena: boolean;

  // Index signature for any additional fields
  [key: string]: unknown;
}

/**
 * Simple sliding window rate limiter
 */
class RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldestInWindow = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldestInWindow) + 100;
      logger.warn('Rate limit reached, waiting', { waitMs });
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    this.timestamps.push(Date.now());
  }
}

const rateLimiter = new RateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

interface LookupParams {
  vin?: string;
  tp?: string;
  orv?: string;
}

/**
 * Lookup vehicle data from Czech Vehicle Registry
 */
export async function lookupVehicle(params: LookupParams): Promise<CzechVehicleApiResponse> {
  const { apiKey, baseUrl } = CompanyConfig.api.czechVehicleRegistry;

  if (!apiKey) {
    throw new Error('CZECH_GOV_API_KEY is not configured');
  }

  if (!params.vin && !params.tp && !params.orv) {
    throw new Error('At least one parameter (vin, tp, orv) is required');
  }

  await rateLimiter.waitForSlot();

  const url = new URL('/api/vehicletechnicaldata/v2', baseUrl);
  if (params.vin) url.searchParams.set('vin', params.vin);
  if (params.tp) url.searchParams.set('tp', params.tp);
  if (params.orv) url.searchParams.set('orv', params.orv);

  logger.info('Looking up vehicle', { params });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'API_KEY': apiKey,
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (response.status === 401) {
      throw new Error('Invalid API key (CZECH_GOV_API_KEY)');
    }

    if (response.status === 429) {
      throw new Error('API rate limit exceeded (27 req/min). Try again later.');
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`API returned status ${response.status}: ${text}`);
    }

    const data: CzechVehicleApiResponse = await response.json();

    if (data.Status !== 1) {
      logger.warn('Vehicle lookup returned non-success status', { status: data.Status, params });
    }

    logger.info('Vehicle lookup completed', {
      status: data.Status,
      hasData: !!data.Data,
      znacka: data.Data?.TovarniZnacka,
    });

    return data;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Vehicle registry API request timed out (10s)');
    }
    logger.error('Vehicle lookup failed', { error: getErrorMessage(error), params });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Lookup vehicle by VIN
 */
export async function lookupByVIN(vin: string): Promise<CzechVehicleApiResponse> {
  return lookupVehicle({ vin });
}

/**
 * Lookup vehicle by Technický průkaz number
 */
export async function lookupByTP(tp: string): Promise<CzechVehicleApiResponse> {
  return lookupVehicle({ tp });
}

/**
 * Lookup vehicle by Osvědčení o registraci vozidla number
 */
export async function lookupByORV(orv: string): Promise<CzechVehicleApiResponse> {
  return lookupVehicle({ orv });
}

/**
 * Map RSV "Palivo" field to internal TypPaliva enum
 * Examples: "BA 95 B" → benzin, "NM" → diesel
 */
export function mapPalivoToTypPaliva(
  palivo: string | null | undefined,
  vozidloElektricke?: string,
  vozidloHybridni?: string
): string | null {
  // Check hybrid/electric flags first
  if (vozidloElektricke?.toUpperCase() === 'ANO') return 'elektro';
  if (vozidloHybridni?.toUpperCase() === 'ANO') {
    // Plugin hybrids typically still list fuel type
    return 'hybrid';
  }

  if (!palivo) return null;
  const p = palivo.toUpperCase();

  if (p.includes('BA') || p.includes('BENZIN') || p.includes('NATURAL')) return 'benzin';
  if (p.includes('NM') || p.includes('NAFTA') || p.includes('DIESEL')) return 'diesel';
  if (p.includes('ELEKTR')) return 'elektro';
  if (p.includes('CNG')) return 'cng';
  if (p.includes('LPG')) return 'lpg';

  return null;
}

/**
 * Parse ISO date string from RSV response to YYYY-MM-DD format
 */
export function parseRsvDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}
