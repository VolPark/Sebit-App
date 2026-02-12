/**
 * Hybrid VIN Decoder
 * 1. Local Database (Preferred for EU cars like Skoda, VW)
 * 2. NHTSA API (Fallback for US/Global cars)
 */

import { createLogger } from '@/lib/logger';
import { decodeLocalVIN } from './vin-data';

const logger = createLogger({ module: 'VIN Decoder' });

export interface VINDecodeResult {
  success: boolean;
  data?: {
    znacka: string;
    model: string;
    rok_vyroby: number;
    typ_paliva?: string;
    barva?: string;
    source?: 'Local' | 'NHTSA';
  };
  error?: string;
}

interface NHTSAResultItem {
  VariableId: number;
  Value: string | null;
}

interface NHTSAResponse {
  Results: NHTSAResultItem[];
}

/**
 * Extract model year from VIN (position 10)
 */
function getYearFromVIN(vin: string): number | null {
  const yearCode = vin.charAt(9).toUpperCase();
  const yearMap: Record<string, number> = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017,
    'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025,
    'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030,
    '0': 2000, '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
    '6': 2006, '7': 2007, '8': 2008, '9': 2009
  };
  return yearMap[yearCode] || null;
}

/**
 * Decode VIN using Hybrid Approach
 */
export async function decodeVIN(vin: string): Promise<VINDecodeResult> {
  if (!vin || vin.length !== 17) {
    return { success: false, error: 'VIN musí mít přesně 17 znaků' };
  }

  // 1. Try Local Decoder first
  const localData = decodeLocalVIN(vin);

  const resultData: Partial<VINDecodeResult['data']> = {
    znacka: localData?.znacka,
    model: localData?.model,
    rok_vyroby: getYearFromVIN(vin) || 0, // 0 indicates unknown, better than false 2026
  };

  if (localData?.znacka || localData?.model) {
    resultData.source = 'Local';
  }

  if (resultData.znacka && resultData.model) {
    logger.info('VIN decode success (Local)', { ...resultData });
  }

  // 2. Fetch NHTSA Data (Always fetch to get Fuel Type or if Local failed)
  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`,
      { cache: 'no-store' }
    );

    if (response.ok) {
      const data: NHTSAResponse = await response.json();
      const results = data.Results;
      const getValue = (variableId: number) => {
        const item = results.find((r) => r.VariableId === variableId);
        const val = item?.Value;
        return (!val || val === 'null' || val === 'Not Applicable') ? null : val;
      };

      const nhtsaMake = getValue(26);
      const nhtsaModel = getValue(28);
      const nhtsaYear = getValue(29);
      const fuelType = getValue(24);

      // Merge logic
      if (!resultData.znacka && nhtsaMake) resultData.znacka = nhtsaMake;

      // Only override local model if local failed, OR if local is generic (which we try to avoid)
      if (!resultData.model && nhtsaModel) {
        resultData.model = nhtsaModel;
        resultData.source = 'NHTSA';
      }

      // If local model is missing, try fallback model fields from NHTSA
      if (!resultData.model) {
        const fallbackModel = getValue(39) || getValue(31) || getValue(32) || getValue(13); // Series, Trim, Body Class, Type
        if (fallbackModel) {
          resultData.model = fallbackModel;
          resultData.source = 'NHTSA';
        }
      }

      if (nhtsaYear) resultData.rok_vyroby = parseInt(nhtsaYear);

      // Fuel Type mapping
      if (fuelType) {
        const fuelLower = fuelType.toLowerCase();
        if (fuelLower.includes('gasoline') || fuelLower.includes('petrol')) resultData.typ_paliva = 'benzin';
        else if (fuelLower.includes('diesel')) resultData.typ_paliva = 'diesel';
        else if (fuelLower.includes('electric')) resultData.typ_paliva = 'elektro';
        else if (fuelLower.includes('plug-in')) resultData.typ_paliva = 'hybrid_plugin';
        else if (fuelLower.includes('hybrid')) resultData.typ_paliva = 'hybrid';
        else if (fuelLower.includes('cng')) resultData.typ_paliva = 'cng';
        else if (fuelLower.includes('lpg')) resultData.typ_paliva = 'lpg';
      }
    }
  } catch (e) {
    logger.warn('NHTSA API failed, relying on local data', { error: e });
  }

  // Final Cleanup
  if (!resultData.znacka) {
    return { success: false, error: 'Nepodařilo se určit výrobce.' };
  }

  if (!resultData.model) {
    resultData.model = 'Neuvedeno';
  }

  // Refine common generic NHTSA models if Local failed
  if (resultData.model === 'PASSENGER CAR' || resultData.model === 'MULTIPURPOSE VEHICLE') {
    resultData.model = 'Osobní automobil (Neznámý model)';
  }

  return {
    success: true,
    data: resultData as VINDecodeResult['data']
  };
}

export function isValidVIN(vin: string): boolean {
  if (!vin || vin.length !== 17) return false;
  if (/[IOQ]/i.test(vin)) return false;
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return false;
  return true;
}

export function isBMW(vin: string): boolean {
  return vin.startsWith('WBA') || vin.startsWith('WBS') || vin.startsWith('WBY');
}
