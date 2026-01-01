const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

async function check() {
    console.log('--- Checking DB Data ---');
    const admin = createClient(supabaseUrl, supabaseKey);
    const anon = createClient(supabaseUrl, supabaseAnon);

    // 1. Check Admin Access (Direct DB)
    const { count: salesCount, error: e1 } = await admin
        .from('accounting_documents')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'sales_invoice');

    console.log(`Admin Sales Count: ${salesCount} (Error: ${e1?.message})`);

    const { count: purchaseCount, error: e2 } = await admin
        .from('accounting_documents')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'purchase_invoice');

    console.log(`Admin Purchase Count: ${purchaseCount} (Error: ${e2?.message})`);

    // 2. Check Anon Access (Frontend Simulation)
    const { count: anonSales, error: e3 } = await anon
        .from('accounting_documents')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'sales_invoice');

    console.log(`Anon Sales Count: ${anonSales} (Error: ${e3?.message})`);

    const { count: anonPurchase, error: e4 } = await anon
        .from('accounting_documents')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'purchase_invoice');

    console.log(`Anon Purchase Count: ${anonPurchase} (Error: ${e4?.message})`);
}

check();
