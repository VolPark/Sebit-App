
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStructure() {
    const { data, error } = await supabase
        .from('accounting_documents')
        .select('id, amount, currency, raw_data')
        .neq('currency', 'CZK')
        .limit(1);

    if (error) console.error(error);
    else console.log(JSON.stringify(data[0] || "No foreign currency docs found", null, 2));
}

checkStructure();
