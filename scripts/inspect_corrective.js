const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    // Try to find invoice with number '1007' (from screenshot)
    // It might be stored in 'number' column or 'variable_symbol'
    const { data } = await supabase
        .from('accounting_documents')
        .select('raw_data')
        .eq('number', '1007')
        .single();

    if (data && data.raw_data) {
        console.log('Document Type:', data.raw_data.document_type);
        console.log('Type:', data.raw_data.type); // Check this too
        console.log(JSON.stringify(data.raw_data, null, 2));
    } else {
        console.log('No document found with number 1007. Trying partial search...');
        const { data: list } = await supabase
            .from('accounting_documents')
            .select('number, raw_data')
            .ilike('number', '%1007%')
            .limit(1);

        if (list && list.length > 0) {
            console.log('Found:', list[0].number);
            console.log('Document Type:', list[0].raw_data.document_type);
            console.log(JSON.stringify(list[0].raw_data, null, 2));
        } else {
            console.log('Still nothing.');
        }
    }
}

inspect();
