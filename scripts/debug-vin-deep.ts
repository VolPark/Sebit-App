
import { decodeVIN } from '@/lib/vin-decoder';

const testVIN = 'TMBJJ7NE9H0123456'; // Skoda Octavia example

async function run() {
    console.log(`--- Fetching raw data for ${testVIN} ---`);
    const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${testVIN}?format=json`
    );
    const data = await response.json();

    // Print ALL non-null values to find where the model might be hiding
    const validResults = data.Results
        .filter((r: any) => r.Value && r.Value !== 'null' && r.Value !== 'Not Applicable')
        .map((r: any) => `${r.VariableId}: ${r.Variable}: ${r.Value}`);

    console.log(validResults.join('\n'));
}

run();
