
import { decodeVIN } from '@/lib/vin-decoder';

const testVINs = [
    'TMBJJ7NE9H0123456', // Skoda (Example)
    'WVWZZZ3CZ8P012345', // VW Passat (Example)
    'WBA3A5C58J0123456', // BMW (Example)
];

// Helper to fetch raw NHTSA data
async function fetchRawNHTSA(vin: string) {
    console.log(`\n--- Fetching raw data for ${vin} ---`);
    const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
    );
    const data = await response.json();

    // Filter for interesting fields to avoid spamming output, but show enough
    const potentialModels = data.Results.filter((r: any) =>
        [26, 28, 29, 24, 27, 39, 31, 32, 14, 15, 13, 9, 34, 144].includes(r.VariableId) ||
        (r.Value && r.Value !== 'null' && r.Value !== 'Not Applicable')
    );

    console.log('Interesting Fields Found:', JSON.stringify(potentialModels.map((r: any) => ({
        Id: r.VariableId,
        Name: r.Variable,
        Value: r.Value
    })), null, 2));
}

async function run() {
    for (const vin of testVINs) {
        await fetchRawNHTSA(vin);
        const decoded = await decodeVIN(vin);
        console.log('Current Decoder Result:', decoded);
    }
}

run();
