const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkInvoice() {
    const { data, error } = await supabase
        .from('accounting_documents')
        .select('*')
        .eq('number', '202601')
        .single();

    if (error) {
        console.error(error);
        return;
    }

    console.log('--- Document ---');
    console.log('ID:', data.id);
    console.log('Number:', data.number);
    console.log('Tax Date (Column):', data.tax_date);
    console.log('Raw Data Tax Date:', data.raw_data.tax_date);
    console.log('Raw Data Keys:', Object.keys(data.raw_data));
}

checkInvoice();
