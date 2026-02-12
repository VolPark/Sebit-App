
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Hardcoded for test script only - will use process.env in real code
const API_KEY = 'jkX2pvEmWGJ_vj-lZposoDpsDBQjQ8xV';
const VIN = 'WBAUZ95060N118610'; // User's BMW X3

async function testApi() {
    if (!API_KEY) {
        console.error('Missing CZECH_GOV_API_KEY');
        return;
    }

    console.log('Testing DataOvozidlech API with VIN:', VIN);

    const headersToTry: Record<string, string>[] = [
        { 'API_KEY': API_KEY },
        { 'Authorization': `ApiKey ${API_KEY}` },
    ];

    // Also try query param for auth
    try {
        console.log('--- Attempt: ?vin=...&api_key=...');
        const res = await fetch(`https://api.dataovozidlech.cz/api/vehicletechnicaldata/v2?vin=${VIN}&api_key=${API_KEY}`, {
            headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
            console.log('SUCCESS with query param auth!');
        }
    } catch { }

    for (const hdrs of headersToTry) {
        try {
            console.log('--- Attempting with headers:', JSON.stringify(hdrs));
            const res = await fetch(`https://api.dataovozidlech.cz/api/vehicletechnicaldata/v2?vin=${VIN}`, {
                headers: { ...hdrs, 'Accept': 'application/json' }
            });
            console.log('Status:', res.status);
            if (res.ok) {
                const data = await res.json();
                console.log('SUCCESS with headers:', JSON.stringify(hdrs));
                console.log('Data:', JSON.stringify(data, null, 2));
                return;
            } else {
                console.log('Error:', await res.text());
            }
        } catch (e) {
            console.error('Failed:', e);
        }
    }
}

testApi();
