const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars. Run with node --env-file=.env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearData() {
    console.log('--- Clearing Accounting Data ---');

    // 1. Clear Mappings (Dependent on Documents)
    console.log('Deleting accounting_mappings...');
    const { error: e1, count: c1 } = await supabase
        .from('accounting_mappings')
        .delete({ count: 'exact' })
        .neq('id', 0); // Delete all rows

    if (e1) console.error('Error:', e1.message);
    else console.log(`Deleted ${c1} mappings.`);

    // 2. Clear Documents
    console.log('Deleting accounting_documents...');
    const { error: e2, count: c2 } = await supabase
        .from('accounting_documents')
        .delete({ count: 'exact' })
        .neq('id', 0);

    if (e2) console.error('Error:', e2.message);
    else console.log(`Deleted ${c2} documents.`);

    // 3. Clear Logs
    console.log('Deleting accounting_sync_logs...');
    const { error: e3, count: c3 } = await supabase
        .from('accounting_sync_logs')
        .delete({ count: 'exact' })
        .neq('id', 0);

    if (e3) console.error('Error:', e3.message);
    else console.log(`Deleted ${c3} logs.`);

    console.log('--- Cleanup Complete ---');
    console.log('Accounting Provider configuration was PRESERVED.');
}

clearData();
