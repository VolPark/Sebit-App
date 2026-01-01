const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Need basic auth header logic again, or direct fetch if I had the credentials... 
// I'll reuse the UolClient class logic but simplified in a script, 
// using the config from DB.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
    // 1. Get Config
    const { data: provider } = await supabase
        .from('accounting_providers')
        .select('config')
        .limit(1)
        .single();

    if (!provider || !provider.config) {
        console.error('No provider config found.');
        return;
    }

    const { baseUrl, email, apiKey } = provider.config;
    const credentials = Buffer.from(`${email}:${apiKey}`).toString('base64');
    const headers = {
        'Accept': 'application/json',
        'Authorization': `Basic ${credentials}`
    };

    // 2. Get an invoice ID to test
    const { data: invoice } = await supabase
        .from('accounting_documents')
        .select('external_id')
        .eq('type', 'sales_invoice')
        .limit(1)
        .single();

    if (!invoice) {
        console.log('No sales invoice to test with.');
        return;
    }

    const invoiceId = invoice.external_id;

    // 3. Test Endpoints
    const endpoints = [
        `/v1/sales_invoices/${invoiceId}`, // Just to verify baseline
        `/v1/sales_invoices/${invoiceId}/payments`,
        `/v1/payments`,
        `/v1/bank_transactions` // Common for accounting
    ];

    for (const ep of endpoints) {
        const url = `${baseUrl}${ep}`;
        console.log(`\nFetching ${url}...`);
        try {
            const res = await fetch(url, { headers });
            console.log(`Status: ${res.status} ${res.statusText}`);
            if (res.ok) {
                const json = await res.json();
                // Log structure (keys) or snippet
                if (Array.isArray(json)) console.log(`Result: Array of ${json.length} items`);
                else if (json.items) console.log(`Result: Collection with ${json.items.length} items`);
                else console.log('Result:', Object.keys(json));

                // If it's the detail, check payment fields again
                if (ep.endsWith(invoiceId)) {
                    console.log('Detail Keys:', Object.keys(json).sort().join(', '));
                }
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
    }
}

probe();
