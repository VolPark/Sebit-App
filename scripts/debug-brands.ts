
import { decodeVIN } from '@/lib/vin-decoder';

const vins = [
    'VF1.........', // Placeholder for Renault if I had one
    'WBA.........', // Placeholder for BMW
];

// Test with dummy VINs having specific year codes
// 2010 = A
// 2020 = L
// 2005 = 5

async function run() {
    console.log('--- Debugging Year and Source ---');

    // 1. Test Year Decoding specifically
    // BMW 2015 (F)
    const bmw2015 = 'WBA3C1100F.......';
    console.log(`Decoding BMW 2015 (F):`, await decodeVIN(bmw2015));

    // Renault 2018 (J)
    const renault2018 = 'VF1xxxxxxJxxxxxxx';
    console.log(`Decoding Renault 2018 (J):`, await decodeVIN(renault2018));

    // Test a "Bad" VIN year (e.g. if char 10 is 'Z' or '0' if '0' is not in map?)
    // 0 is in map (2000). 
    // Z is usually not a year code (it's 1980/2010... wait Z is not used? Y=2000, 1=2001?
    // Let's check my map in vin-decoder.ts logic.
}

run();
