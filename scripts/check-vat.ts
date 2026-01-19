
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const checkVat = async () => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check Dec 2025
    const startDec = '2025-12-01';
    const endDec = '2025-12-31';

    // Check Jan 2026
    const startJan = '2026-01-01';
    const endJan = '2026-01-31';

    async function getVat(start: string, end: string, label: string) {
        // Output (Liabilities) - 343 on Credit (D)
        const { data: output } = await supabase.from('accounting_journal')
            .select('amount, account_d, text, date')
            .ilike('account_d', '343%')
            .gte('date', start)
            .lte('date', end);

        // Input (Receivables) - 343 on Debit (MD)
        const { data: input } = await supabase.from('accounting_journal')
            .select('amount, account_md, text, date')
            .ilike('account_md', '343%')
            .gte('date', start)
            .lte('date', end);

        const outSum = output?.reduce((s, i) => s + i.amount, 0) || 0;
        const inSum = input?.reduce((s, i) => s + i.amount, 0) || 0;
        const net = outSum - inSum;

        console.log(`\n--- ${label} (${start} to ${end}) ---`);
        console.log(`Input (MD): ${inSum.toFixed(2)}`);
        console.log(`Output (D): ${outSum.toFixed(2)}`);
        console.log(`NET (To Pay): ${net.toFixed(2)}`);

        // Detailed check if close to 51487
        if (Math.abs(net - 51487.61) < 1000) {
            console.log(">>> MATCH FOUND! This is the period user refers to.");
        }
    }

    await getVat(startDec, endDec, 'December 2025');
    await getVat(startJan, endJan, 'January 2026');
    // Also try Q4 2025
    await getVat('2025-10-01', '2025-12-31', 'Q4 2025');
};

checkVat();
