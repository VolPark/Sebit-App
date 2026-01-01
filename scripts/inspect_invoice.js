const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data } = await supabase
        .from('accounting_documents')
        .select('raw_data')
        .limit(1)
        .single();

    if (data && data.raw_data) {
        console.log(JSON.stringify(data.raw_data, null, 2));
    } else {
        console.log('No data found');
    }
}

inspect();
