
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const checkBalance = async () => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Sum all 343 MD
    const { data: md } = await supabase.from('accounting_journal')
        .select('amount')
        .ilike('account_md', '343%');

    // Sum all 343 D
    const { data: d } = await supabase.from('accounting_journal')
        .select('amount')
        .ilike('account_d', '343%');

    const sumMd = md?.reduce((acc, r) => acc + r.amount, 0) || 0;
    const sumD = d?.reduce((acc, r) => acc + r.amount, 0) || 0;

    const balance = sumD - sumMd;

    console.log("--- Account 343 Balance Check ---");
    console.log(`Total MD (Input/Paid): ${sumMd.toFixed(2)}`);
    console.log(`Total D  (Output/Liab): ${sumD.toFixed(2)}`);
    console.log(`BALANCE (D - MD):      ${balance.toFixed(2)}`);

    const target = 51487.61;
    console.log(`Target:                ${target}`);
    console.log(`Diff:                  ${(balance - target).toFixed(2)}`);
};

checkBalance();
