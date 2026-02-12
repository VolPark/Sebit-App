
import { decodeVIN } from '@/lib/vin-decoder';

const testVINs = [
    'TMBJJ7NE9H0123456', // Skoda Octavia
    'TMBLE9NS4J8000000', // Skoda Kodiaq (Test)
    'WVWZZZ3CZ8P012345', // VW Passat
    'TMAH281UAKJ000000', // Hyundai (Nošovice) - i30?
    'U5YHN812ALL000000', // Kia (Žilina)
    'WBA5K310000000000', // BMW
    '5YJ3E1EA5KF000000', // Tesla (US - Should fall back to NHTSA)
];

async function run() {
    console.log('--- Hybrid VIN Decoder Test ---');
    for (const vin of testVINs) {
        console.log(`Decoding ${vin}...`);
        const result = await decodeVIN(vin);
        console.log(`Result: ${result.data?.znacka} ${result.data?.model} (${result.data?.rok_vyroby}) - Source: ${result.data?.source}`);
    }
}

run();
