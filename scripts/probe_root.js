const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
    const { data: provider } = await supabase
        .from('accounting_providers')
        .select('config')
        .limit(1)
        .single();

    if (!provider || !provider.config) return;

    const { baseUrl, email, apiKey } = provider.config;
    const credentials = Buffer.from(`${email}:${apiKey}`).toString('base64');
    const headers = { 'Accept': 'application/json', 'Authorization': `Basic ${credentials}` };

    // Try root to see if it lists endpoints
    const url = `${baseUrl}/v1/`;
    console.log(`\nFetching ${url}...`);
    try {
        const res = await fetch(url, { headers });
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const json = await res.json();
            console.log(JSON.stringify(json, null, 2));
        } else {
            // Try without /v1/
            const url2 = `${baseUrl}/`;
            console.log(`\nFetching ${url2}...`);
            const res2 = await fetch(url2, { headers });
            if (res2.ok) {
                const json = await res2.json();
                console.log(JSON.stringify(json, null, 2));
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

probe();
