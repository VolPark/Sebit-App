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
        console.log(Object.keys(data.raw_data).sort().join('\n'));
    }
}

inspect();
