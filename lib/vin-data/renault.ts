import { VINDecodeResult } from '../vin-decoder';

export function decodeRenault(vin: string): Partial<VINDecodeResult['data']> | null {
    // WMI: VF1 (Renault France), but also others in WMI list.
    // VDS: Pos 4-9.
    // Year: Pos 10 (Standard ISO)

    const vds = vin.substring(3, 9);

    // Pos 4 (Index 3): Vehicle Type / Application?
    // Pos 5 (Index 4): Model Code (Often)
    // Pos 6 (Index 5): Engine?

    // Known Model Codes (Pos 4-5 or just 5)
    // This is tricky without a full database, but let's try some known patterns.
    // Clio: often 'B' in pos 4? or '5'?
    // Megane: 'B' or 'M'?
    // Captur: 'J' or 'R'?

    // Better approach for Renault:
    // Look at the first 3 chars of VDS (Pos 4-6) or even 4-7.

    const modelCode = vin.substring(3, 5); // Index 3-4 (e.g. 'BZ', 'DZ', 'JZ')

    // Megane III: BZ, DZ, KZ, JZ (Scenic)
    // Megane IV: B9, K9, L9...
    // Clio IV: BH, KH
    // Clio V: B7?
    // Captur: J87? 

    const patterns: Record<string, string> = {
        // Clio
        '55': 'Clio I',
        'BB': 'Clio II',
        'CB': 'Clio II',
        'BR': 'Clio III',
        'CR': 'Clio III',
        'BH': 'Clio IV',
        'KH': 'Clio IV (Estate)',
        'B7': 'Clio V',
        'RJa': 'Clio V', // ?

        // Megane
        'BA': 'Megane I',
        'BM': 'Megane II',
        'CM': 'Megane II',
        'BZ': 'Megane III',
        'DZ': 'Megane III (Coupe)',
        'KZ': 'Megane Grandtour',
        'JZ': 'Scenic / Grand Scenic',
        'B9': 'Megane IV',
        'K9': 'Megane IV (Estate)',
        'LVC': 'Megane E-Tech', // ?

        // Captur
        'J5': 'Captur I', // J87?
        'R': 'Captur II', // RJ?
        'HJ': 'Captur II',

        // Kadjar
        'HL': 'Kadjar',
        'HA': 'Kadjar',

        // Austral
        'RH': 'Austral',

        // Arkana
        'JL': 'Arkana',
        'RJL': 'Arkana',

        // Zoe
        'AG': 'Zoe',
        'BF': 'Zoe',

        // Master
        'FD': 'Master',
        'JD': 'Master',
        'FV': 'Master',
        'JV': 'Master',

        // Trafic
        'FL': 'Trafic',
        'JG': 'Trafic III',
        'FG': 'Trafic III',

        // Kangoo
        'KC': 'Kangoo I',
        'FW': 'Kangoo II',
        'KW': 'Kangoo II',
        'RFK': 'Kangoo III', // ?
    };

    // Try matching 2-char codes logic
    let model = patterns[modelCode];

    // Priority to 3-char codes if they exist (more specific)
    const code3 = vin.substring(3, 6);
    if (code3.startsWith('RJA')) model = 'Clio V';
    if (code3.startsWith('RJB')) model = 'Captur II';
    if (code3.startsWith('LVC')) model = 'Megane E-Tech';

    if (!model) {
        // Fallback or fuzzy
    }

    if (model) {
        return { znacka: 'Renault', model };
    }

    // Fallback for known generic project codes if possible
    if (vin.includes('VF1R')) { // Starts with VF1R often indicates recent SUVs/Crossovers?
        // Too risky to guess
    }

    return null;
}
