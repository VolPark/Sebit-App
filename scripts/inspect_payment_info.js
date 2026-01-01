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
        .select('number, type, amount, raw_data')
        .limit(5);

    if (data) {
        data.forEach(doc => {
            console.log(`\nDoc: ${doc.number} (${doc.type})`);
            const rd = doc.raw_data;
            console.log('Status:', rd.status);
            console.log('Payment Method:', rd.payment_method);
            console.log('Paid Amount:', rd.paid_amount); // Guessing field name
            console.log('Amount Paid:', rd.amount_paid); // Guessing field name
            console.log('Date of Receipt:', rd.date_of_receipt);
            console.log('Tax Payment Date:', rd.tax_payment_date);
            console.log('Cancellation Date:', rd.cancellation_date);
            // Check for any field containing 'paid' or 'payment'
            const keys = Object.keys(rd).filter(k => k.includes('paid') || k.includes('payment') || k.includes('amount'));
            console.log('Related Keys:', keys.join(', '));
        });
    }
}

inspect();
