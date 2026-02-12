import { VINDecodeResult } from '../vin-decoder';

export function decodeVW(vin: string): Partial<VINDecodeResult['data']> | null {
    // VW is complex, but some sequences are telling
    const vds = vin.substring(3, 9);

    // VW often uses Pos 7-8 for Model in recent cars, similar to Audi/Skoda sometimes,
    // BUT VW often uses filler 'ZZZ' in VDS for EU cars and puts model code in positions 7-8 OR uses specific codes.
    // Actually, for VW EU:
    // WVW ZZZ [1K] Z [Year] ...
    // The chars at 7-8 (index 6-7) often indicate platform keys like '1K' (Golf 5/6), '3C' (Passat B6), etc.

    const modelCode = vin.substring(6, 8); // Chars 7-8
    const fullVDS = vin.substring(3, 9); // Chars 4-9

    const models: Record<string, string> = {
        // Golf
        '1K': 'Golf V/VI',
        '5K': 'Golf VI',
        '5G': 'Golf VII',
        'CD': 'Golf VIII',
        'AU': 'Golf VII (Variant)',

        // Passat
        '3B': 'Passat B5',
        '3C': 'Passat B6/B7',
        '3G': 'Passat B8',
        'CB': 'Passat B8 (Facelift)',
        'A3': 'Passat NMS', // US?

        // Tiguan
        '5N': 'Tiguan I',
        'AX': 'Tiguan II', // AD/AX
        'CT': 'Tiguan Allspace',

        // Touareg
        '7L': 'Touareg I',
        '7P': 'Touareg II',
        'CR': 'Touareg III',

        // Transporter
        '7H': 'Transporter T5',
        '7E': 'Transporter T5/T6',
        '7J': 'Transporter T5/T6',
        'SH': 'Transporter T6.1',
        '70': 'Transporter T4',

        // Caddy
        '2K': 'Caddy III/IV',
        'SB': 'Caddy V',

        // Polo
        '9N': 'Polo IV',
        '6R': 'Polo V',
        '6C': 'Polo V (Facelift)',
        'AW': 'Polo VI',
        'AE': 'Polo VI',

        // Arteon
        '3H': 'Arteon',

        // UP
        'AA': 'Up!',

        // ID Series (Often have different structures, e.g., 'E1' for ID.3 or similar?)
        // ID.3 is often 'E11' model code in parts, but VIN might be different.
        // Let's try to catch ID.3/4 if they use standard platform codes
        'E1': 'ID.3',
        'E2': 'ID.4',
        'E3': 'ID.5', // Guess/Check
        'BJ': 'ID.Buzz',
    };

    if (models[modelCode]) {
        return { znacka: 'Volkswagen', model: models[modelCode] };
    }

    // ID.3 / ID.4 check helper (often starts with 'E' in model position)
    if (vin.substring(6, 7) === 'E') {
        if (modelCode === 'E1') return { znacka: 'Volkswagen', model: 'ID.3' };
        if (modelCode === 'E2') return { znacka: 'Volkswagen', model: 'ID.4' };
        if (modelCode === 'E3') return { znacka: 'Volkswagen', model: 'ID.5' };
    }

    return null;
}

export function decodeHyundaiKia(vin: string): Partial<VINDecodeResult['data']> | null {
    // Hyundai (TMA - Nošovice) / Kia (U5Y - Žilina)
    // Model codes are often in Pos 4 or 5
    const wmi = vin.substring(0, 3);

    if (wmi === 'TMA') { // Hyundai Czech
        // Pos 4-5 usually Model
        const modelCode = vin.substring(3, 5); // Index 3-4
        // Example: TMA H2 5... -> H2? Or maybe single char?
        // Actually typical: TMA H 3 8 1 ... 
        // Pos 4 = Line, Pos 5 = Model & Drive?

        // Common Nošovice Models:
        // PC - i30 (PDE)
        // P3 - i30
        // J5 - Tucson (TL)
        // NX - Tucson (NX4)
        // LE - ix20 (old)

        // Let's try matching broader
        const vds = vin.substring(3, 8);

        if (vds.includes('PC') || vds.includes('P3') || vds.includes('GD') || vds.includes('FD')) return { znacka: 'Hyundai', model: 'i30' };
        if (vds.includes('NX') || vds.includes('TL') || vds.includes('LM')) return { znacka: 'Hyundai', model: 'Tucson' };
        if (vds.includes('JC')) return { znacka: 'Hyundai', model: 'ix20' };
        if (vds.includes('SX')) return { znacka: 'Hyundai', model: 'Kona Electric' }; // Kona made in Nošovice too?
    }

    if (wmi === 'U5Y') { // Kia Slovakia
        // Pos 4-5
        const vds = vin.substring(3, 8);

        if (vds.includes('CD') || vds.includes('JD') || vds.includes('ED')) return { znacka: 'Kia', model: 'Ceed' };
        if (vds.includes('NQ') || vds.includes('QL') || vds.includes('SL')) return { znacka: 'Kia', model: 'Sportage' };
        if (vds.includes('YN')) return { znacka: 'Kia', model: 'Venga' };
    }

    return null;
}

export function decodeBMW(vin: string): Partial<VINDecodeResult['data']> | null {
    const code = vin.substring(3, 5); // Index 3-4 (First 2 chars of VDS)

    // 3 Series (E90/F30/G20 common prefixes)
    // E90: V...
    // F30: 3A, 3B, 3D, 8A, 8C, 8E
    // G20: 5R, 5V
    if (['VA', 'VB', 'VC', 'VD', 'VE', 'VF', 'VG', 'VH', 'VI', 'VJ', 'VK', 'VL', 'VM', 'VN', 'VO', 'VP', 'VR', 'VS', 'VT', 'VU', 'VV', 'VW', 'VX', 'VY', 'VZ',
        '3A', '3B', '3C', '3D', '3E', '3F', '3G', '3H', '3J', '3K', '3L', '3M', '3N', '3P', '3R', '3S',
        '8A', '8B', '8C', '8D', '8E',
        '5R', '5V'].includes(code)) {
        return { znacka: 'BMW', model: '3 Series' };
    }

    // 5 Series (E60/F10/G30)
    // E60: N...
    // F10: 5A..5E, F...
    // G30: J...
    if (['NA', 'NB', 'NC', 'ND', 'NE', 'NF', 'NG', 'NH', 'NI', 'NJ', 'NK', 'NL', 'NM', 'NN', 'NO', 'NP', 'NQ', 'NR', 'NS', 'NT', 'NU', 'NV', 'NW', 'NX', 'NY', 'NZ',
        '5A', '5B', '5C', '5D', '5E', 'FW', 'FR', 'FS', 'FV', 'FT',
        'JA', 'JB', 'JC', 'JD', 'JE', 'JF', 'JG', 'JH', 'JI', 'JJ', 'JK', 'JL', 'JM', 'JN', 'JO', 'JP', 'JQ', 'JR', 'JS', 'JT', 'JU', 'JV', 'JW', 'JX', 'JY', 'JZ'].includes(code)) {
        return { znacka: 'BMW', model: '5 Series' };
    }

    // X5 (E70/F15/G05)
    // E70: F...
    // F15: K...
    // G05: C...
    if (['FE', 'FF', 'FG', 'FH', 'KR', 'KS', 'KT', 'CR', 'CV', 'CW', 'CX', 'CY'].includes(code)) {
        return { znacka: 'BMW', model: 'X5' };
    }

    // X3 (E83/F25/G01)
    // E83: PB, PC, PD, PE, PF...
    // F25: WX, WY, WZ, TY, TZ...
    // G01: UZ... (e.g. UZ91, UZ95)
    if (['PB', 'PC', 'PD', 'PE', 'PF', 'WX', 'WY', 'WZ', 'TY', 'TZ', 'UZ', 'TY', 'TZ'].includes(code)) {
        return { znacka: 'BMW', model: 'X3' };
    }

    return null; // Defer to NHTSA if unknown
}
