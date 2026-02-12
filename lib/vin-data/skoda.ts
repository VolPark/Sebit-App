import { VINDecodeResult } from '../vin-decoder';

export function decodeSkoda(vin: string): Partial<VINDecodeResult['data']> | null {
    const vds = vin.substring(3, 9); // Characters 4-9
    // Skoda usually encodes model in chars 7-8 of VDS (so 7-8 of VDS string, which is index 6-7 of VIN? No VDS is 6 chars. 
    // VIN: 0 1 2 | 3 4 5 6 7 8 | 9...
    //      WMI   | V D S       | Year...

    // Skoda standard:
    // Pos 4: Body/Drive/Equipment (varies)
    // Pos 5: Engine/Power
    // Pos 6: Airbags/Restraint
    // Pos 7-8: Model Code
    // Pos 9: Check digit or internal code

    const modelCode = vin.substring(6, 8); // Characters 7-8 (0-indexed)

    const models: Record<string, string> = {
        // Current/Recent Models
        'NX': 'Octavia IV',
        'NE': 'Octavia IV (Hybrid/RS)', // Often shares codes
        'NR': 'Octavia', // Variant

        '3V': 'Superb III',
        '3T': 'Superb II', // Older

        'NS': 'Kodiaq',
        'NV': 'Kodiaq', // E.g. GT or specific market

        'NU': 'Karoq',
        'ND': 'Karoq',

        'NW': 'Scala / Kamiq', // Often share platform/codes
        // How to distinguish Scala vs Kamiq? Often position 4 or 5 differentiates body type.
        // Let's keep it combined or try to refine later if possible.
        // Alternatively: 
        // Kamiq often uses 'NW' with specific body chars? 
        // Actually Scala often is 'NW1', Kamiq 'NW4'? Let's check generally. 

        'NJ': 'Fabia III',
        'PJ': 'Fabia IV', // New Fabia

        'NH': 'Rapid',

        '5L': 'Yeti',

        '1Z': 'Octavia II',
        '5E': 'Octavia III',

        '5J': 'Fabia II / Roomster',

        '36': 'Superb II',

        'AA': 'Citigo',

        // EVs
        'NY': 'Enyaq iV', // Enyaq
        'NZ': 'Enyaq iV', // Coupe?
    };

    // Enyaq Specifics?
    // 5th char (index 4) for Enyaq power: A=109, B=132, C=150...

    let model = models[modelCode];

    // Special handling for Scala/Kamiq separation if possible
    if (modelCode === 'NW') {
        // Often Kamiq is SUV style body type code?
        // Assume "Scala / Kamiq" if uncertain
    }

    if (!model) {
        // Fallback for older patterns
        if (vin.includes('1U')) model = 'Octavia I';
        if (vin.includes('6Y')) model = 'Fabia I';
    }

    if (model) {
        return {
            znacka: 'Škoda',
            model: model,
            // Year will be handled by common decoder logic or refined here
        };
    }

    return null;
}
