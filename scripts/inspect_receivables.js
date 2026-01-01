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

    // 1. Inspect receivables
    console.log('--- Inspecting Receivables ---');
    try {
        const res = await fetch(`${baseUrl}/v1/receivables`, { headers });
        if (res.ok) {
            const json = await res.json();
            if (json.items && json.items.length > 0) {
                console.log('Receivable Schema:', Object.keys(json.items[0]).join(', '));
                console.log('Sample Receivable:', JSON.stringify(json.items[0], null, 2));
            } else {
                console.log('Receivables empty.');
            }
        }
    } catch (e) { console.error(e.message); }

    // 2. Probe for payables alternatives
    console.log('\n--- Probing Payables Alternatives ---');
    const candidates = ['/v1/liabilities', '/v1/obligations', '/v1/debts', '/v1/purchase_payments', '/v1/outgoing_payments'];
    for (const ep of candidates) {
        try {
            const res = await fetch(`${baseUrl}${ep}`, { headers });
            console.log(`${ep}: ${res.status}`);
        } catch (e) { }
    }
}

probe();
