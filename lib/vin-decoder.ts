/**
 * VIN Decoder using NHTSA API (Free, no API key required)
 * Works for vehicles from EU/US manufacturers
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger({ module: 'VIN Decoder' });

export interface VINDecodeResult {
  success: boolean;
  data?: {
    znacka: string;
    model: string;
    rok_vyroby: number;
    typ_paliva?: string;
    barva?: string;
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
 * https://en.wikipedia.org/wiki/Vehicle_identification_number#Model_year
 */
function getYearFromVIN(vin: string): number | null {
  const yearCode = vin.charAt(9).toUpperCase();

  // Year codes: A=2010, B=2011, ..., Y=2030 (excluding I, O, Q, U, Z in some ranges)
  const yearMap: Record<string, number> = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017,
    'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025,
    'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030,
    // Numeric codes (2001-2009 cycle, or 1980-1989/2000)
    '0': 2000, '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
    '6': 2006, '7': 2007, '8': 2008, '9': 2009
  };

  return yearMap[yearCode] || null;
}

/**
 * Decode VIN using NHTSA API
 * API Documentation: https://vpic.nhtsa.dot.gov/api/
 */
export async function decodeVIN(vin: string): Promise<VINDecodeResult> {
  if (!vin || vin.length !== 17) {
    return {
      success: false,
      error: 'VIN musí mít přesně 17 znaků'
    };
  }

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: NHTSAResponse = await response.json();

    if (!data.Results || data.Results.length === 0) {
      return {
        success: false,
        error: 'Nepodařilo se dekódovat VIN'
      };
    }

    // Map NHTSA response to our format
    const results = data.Results;
    const getValue = (variableId: number) => {
      const item = results.find((r) => r.VariableId === variableId);
      const value = item?.Value;
      // Filter out empty, null, "Not Applicable", "N/A" etc.
      if (!value || value === 'null' || value === 'Not Applicable' || value === 'N/A' || value.trim() === '') {
        return null;
      }
      return value;
    };

    let make = getValue(26); // Make
    let model = getValue(28); // Model
    let modelYear = getValue(29); // Model Year
    const fuelType = getValue(24); // Fuel Type - Primary

    // Fallback: Try alternative field IDs
    if (!make) make = getValue(27); // Manufacturer Name

    // Try multiple model fields - avoid generic terms
    if (!model || model === 'PASSENGER CAR' || model === 'TRUCK' || model === 'MULTIPURPOSE VEHICLE') {
      model = getValue(39) || getValue(31) || getValue(32); // Try Series, Trim, Body Class
    }

    // Last resort: use body type if nothing else available
    if (!model || model === 'PASSENGER CAR') {
      const series = getValue(30); // Series
      if (series && series !== 'Not Applicable') {
        model = series;
      }
    }

    // Fallback: Extract year from VIN if API didn't return it
    if (!modelYear) {
      const vinYear = getYearFromVIN(vin);
      if (vinYear) {
        modelYear = vinYear.toString();
      }
    }

    // Try to get manufacturer from VIN WMI if Make is still missing
    if (!make) {
      const wmiMake = getManufacturerFromVIN(vin);
      if (wmiMake) {
        make = wmiMake;
      }
    }

    // Validate we got at least manufacturer
    if (!make) {
      logger.info('VIN decode - no manufacturer found', { make, model, modelYear, vin: vin.substring(0, 8) + '...' });
      return {
        success: false,
        error: 'VIN dekódován, ale chybí výrobce. Zkuste zadat údaje ručně nebo zkontrolujte VIN.'
      };
    }

    // Year and Model are now optional - return partial data
    if (!modelYear) {
      logger.info('VIN decode - no year found, using fallback', { make, model, vin: vin.substring(0, 8) + '...', yearCode: vin.charAt(9) });
      modelYear = new Date().getFullYear().toString(); // Default to current year
    }

    if (!model) {
      model = 'Neuvedeno';
    }

    // Map fuel type to Czech
    let typ_paliva: string | undefined;
    if (fuelType) {
      const fuelLower = fuelType.toLowerCase();
      if (fuelLower.includes('gasoline') || fuelLower.includes('petrol')) {
        typ_paliva = 'benzin';
      } else if (fuelLower.includes('diesel')) {
        typ_paliva = 'diesel';
      } else if (fuelLower.includes('electric')) {
        typ_paliva = 'elektro';
      } else if (fuelLower.includes('plug-in')) {
        typ_paliva = 'hybrid_plugin';
      } else if (fuelLower.includes('hybrid')) {
        typ_paliva = 'hybrid';
      } else if (fuelLower.includes('cng') || fuelLower.includes('natural gas')) {
        typ_paliva = 'cng';
      } else if (fuelLower.includes('lpg') || fuelLower.includes('propane')) {
        typ_paliva = 'lpg';
      }
    }

    const result = {
      success: true,
      data: {
        znacka: make,
        model: model,
        rok_vyroby: parseInt(modelYear),
        typ_paliva,
      }
    };

    logger.info('VIN decode success', { znacka: make, model, rok: parseInt(modelYear) });
    return result;
  } catch (error) {
    logger.error('VIN decode error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Chyba při dekódování VIN'
    };
  }
}

/**
 * Check if VIN is valid format (basic validation)
 */
export function isValidVIN(vin: string): boolean {
  if (!vin || vin.length !== 17) return false;

  // VIN cannot contain I, O, or Q
  if (/[IOQ]/i.test(vin)) return false;

  // VIN must be alphanumeric
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return false;

  return true;
}

/**
 * Extract manufacturer from VIN (World Manufacturer Identifier)
 */
export function getManufacturerFromVIN(vin: string): string | null {
  if (!isValidVIN(vin)) return null;

  const wmi = vin.substring(0, 3).toUpperCase();

  // Common European manufacturers
  const manufacturers: Record<string, string> = {
    // BMW
    'WBA': 'BMW',
    'WBS': 'BMW M',
    'WBY': 'BMW',
    // Mercedes-Benz
    'WDB': 'Mercedes-Benz',
    'WDD': 'Mercedes-Benz',
    'WDC': 'Mercedes-Benz',
    // Volkswagen Group
    'WVW': 'Volkswagen',
    'WV1': 'Volkswagen Commercial',
    'WV2': 'Volkswagen',
    'WAU': 'Audi',
    'TRU': 'Audi',
    'WUA': 'Audi Quattro',
    'VSS': 'SEAT',
    'TMB': 'Škoda',
    'XW8': 'Škoda',
    // Others
    'VF1': 'Renault',
    'VF3': 'Peugeot',
    'VF7': 'Citroën',
    'ZAR': 'Alfa Romeo',
    'ZFA': 'Fiat',
    'VSE': 'Suzuki Europe',
  };

  return manufacturers[wmi] || null;
}

/**
 * Check if VIN belongs to BMW (for CarData eligibility)
 */
export function isBMW(vin: string): boolean {
  if (!isValidVIN(vin)) return false;
  const wmi = vin.substring(0, 3).toUpperCase();
  return wmi === 'WBA' || wmi === 'WBS' || wmi === 'WBY';
}
