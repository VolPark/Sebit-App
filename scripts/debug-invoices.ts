
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from one level up
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspect() {
    console.log('Inspecting purchase invoices...');

    // 1. Check all purchase invoices
    const { data: allDocs, error } = await supabase
        .from('accounting_documents')
        .select('id, number, amount, paid_amount, supplier_name, type')
        .eq('type', 'purchase_invoice');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Total purchase invoices: ${allDocs.length}`);

    // 2. Check for "technically" unpaid
    const unpaid = allDocs.filter(d => (d.amount - (d.paid_amount || 0)) > 1);
    console.log(`Unpaid (>1 CZK): ${unpaid.length}`);
    unpaid.forEach(d => console.log(`UNPAID: ${d.number} | AMT: ${d.amount} | PAID: ${d.paid_amount}`));

    // 3. Find specific amount 2269
    const match = allDocs.find(d => Math.abs(d.amount - (d.paid_amount || 0)) > 2000 && Math.abs(d.amount - (d.paid_amount || 0)) < 2500);
    if (match) {
        console.log('Found potential match ~2269:', match);
    }

    // 4. Sum up simple remaining
    const sum = unpaid.reduce((s, d) => s + (d.amount - (d.paid_amount || 0)), 0);
    console.log(`Calculated Sum from Documents: ${sum}`);
}

inspect();
