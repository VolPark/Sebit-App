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

    const candidates = [
        '/v1/payables',
        '/v1/payable',
        '/v1/liabilities',
        '/v1/commitments',
        '/v1/obligations',
        '/v1/debts',
        '/v1/supplier_invoices',
        '/v1/suppliers_invoices',
        '/v1/incoming_invoices',
        '/v1/received_invoices',
        '/v1/purchase_invoices/payables', // sub-resource?
        '/v1/purchases',
        '/v1/expenses'
    ];

    console.log('--- Probing Extended Candidates ---');
    for (const ep of candidates) {
        try {
            const res = await fetch(`${baseUrl}${ep}`, { headers });
            console.log(`${ep}: ${res.status}`);
            if (res.ok) {
                const json = await res.json();
                console.log(`!!! FOUND ${ep} !!! Items: ${json.length || json.items?.length}`);
            }
        } catch (e) { }
    }
}

probe();
