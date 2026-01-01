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

    const endpoints = [
        '/v1/bank_transactions',
        '/v1/cash_vouchers'
    ];

    for (const ep of endpoints) {
        const url = `${baseUrl}${ep}`;
        console.log(`\nFetching ${url}...`);
        try {
            const res = await fetch(url, { headers });
            console.log(`Status: ${res.status}`);
            if (res.ok) {
                const json = await res.json();
                const items = json.items || [];
                console.log(`Found ${items.length} items.`);
                if (items.length > 0) {
                    console.log('Sample Item Keys:', Object.keys(items[0]).join(', '));
                    console.log('Sample Item:', JSON.stringify(items[0], null, 2));
                }
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
    }
}

probe();
