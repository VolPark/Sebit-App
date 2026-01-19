
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const debugVat = async () => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Helper
    async function getMonth(isoDateRequest: string) {
        // e.g. '2026-01'
        const start = `${isoDateRequest}-01`;
        // Last day of month
        const date = new Date(start);
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0); // last day
        const end = nextMonth.toISOString().split('T')[0];

        // Output (Liabilities) - 343 on Credit (D)
        const { data: output } = await supabase.from('accounting_journal')
            .select('amount, account_d, date')
            .ilike('account_d', '343%')
            .gte('date', start)
            .lte('date', end);

        // Input (Receivables) - 343 on Debit (MD)
        const { data: input } = await supabase.from('accounting_journal')
            .select('amount, account_md, date')
            .ilike('account_md', '343%')
            .gte('date', start)
            .lte('date', end);

        const outSum = output?.reduce((s, i) => s + i.amount, 0) || 0;
        const inSum = input?.reduce((s, i) => s + i.amount, 0) || 0;
        const net = outSum - inSum;

        console.log(`\nPERIOD: ${isoDateRequest} (${start} to ${end})`);
        console.log(`  Output (343 D):  ${outSum.toFixed(2)}`);
        console.log(`  Input  (343 MD): ${inSum.toFixed(2)}`);
        console.log(`  NET RESULT:      ${net.toFixed(2)} (${net > 0 ? 'PAY' : 'REFUND'})`);

        return net;
    }

    console.log("Checking VAT periods...");
    await getMonth('2025-10');
    await getMonth('2025-11');
    await getMonth('2025-12');
    await getMonth('2026-01');
};

debugVat();
