const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
    const { data: provider } = await supabase.from('accounting_providers').select('config').single();
    if (!provider?.config) return;

    const { baseUrl, email, apiKey } = provider.config;
    const credentials = Buffer.from(`${email}:${apiKey}`).toString('base64');
    const headers = { 'Accept': 'application/json', 'Authorization': `Basic ${credentials}` };

    const endpoints = ['/v1/receivables', '/v1/payables']; // guessing payables based on receivables

    for (const ep of endpoints) {
        const url = `${baseUrl}${ep}`;
        console.log(`\nFetching ${url}...`);
        try {
            const res = await fetch(url, { headers });
            console.log(`Status: ${res.status}`);
            if (res.ok) {
                const json = await res.json();
                console.log(`Items found: ${json.length || json.items?.length || 0}`);
                if (Array.isArray(json) && json.length > 0) {
                    console.log('Sample:', Object.keys(json[0]));
                } else if (json.items && json.items.length > 0) {
                    console.log('Sample:', Object.keys(json.items[0]));
                }
            }
        } catch (e) { console.error(e.message); }
    }
}

probe();
