
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    console.log('Fetching...');
    const { data, error } = await supabase
        .from('accounting_journal')
        .select('*')
        .eq('fiscal_year', 2026)
        .or('account_md.ilike.343%,account_d.ilike.343%');

    if (error) {
        console.error(error);
        return;
    }

    const payments = data.filter(item => {
        const involvesClass2 = (item.account_md && item.account_md.startsWith('2')) || (item.account_d && item.account_d.startsWith('2'));
        return involvesClass2;
    });

    console.log('--- VAT Payments in 2026 ---');
    payments.forEach(p => {
        console.log(`Date: ${p.date}, Amount: ${p.amount}, Text: "${p.text}", MD: ${p.account_md}, D: ${p.account_d}`);
    });
}

main();
