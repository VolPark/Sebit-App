import { commonWMI } from './wmi-list';
import { decodeSkoda } from './skoda';
import { decodeVW, decodeHyundaiKia, decodeBMW } from './other-brands';
import { VINDecodeResult } from '../vin-decoder';

/**
 * Local VIN Decoder Registry
 * Tries to decode VIN using local rules before falling back to API
 */
export function decodeLocalVIN(vin: string): Partial<VINDecodeResult['data']> | null {
    const wmi = vin.substring(0, 3).toUpperCase();
    const manufacturer = commonWMI[wmi];

    if (!manufacturer) return null; // Unknown manufacturer -> fallback to API purely

    let result: Partial<VINDecodeResult['data']> | null = {
        znacka: manufacturer
    };

    // Manufacturer specific decoders
    if (manufacturer === 'Škoda') {
        const skodaData = decodeSkoda(vin);
        if (skodaData) result = { ...result, ...skodaData };
    }
    else if (manufacturer.includes('Volkswagen')) { // Match 'Volkswagen', 'Volkswagen SUV', etc.
        const vwData = decodeVW(vin);
        if (vwData) result = { ...result, ...vwData };
    }
    else if (manufacturer === 'Hyundai' || manufacturer === 'Kia' || wmi === 'TMA' || wmi === 'U5Y') {
        const koreaData = decodeHyundaiKia(vin);
        if (koreaData) result = { ...result, ...koreaData };
    }
    else if (manufacturer.includes('BMW')) {
        const bmwData = decodeBMW(vin);
        if (bmwData) result = { ...result, ...bmwData };
    }
    // Ford, etc. can be added here

    return result;
}
