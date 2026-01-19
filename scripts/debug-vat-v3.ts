
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const debugVatNoJoin = async () => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    async function getMonth(isoDateRequest: string) {
        const start = `${isoDateRequest}-01`;
        const date = new Date(start);
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const end = nextMonth.toISOString().split('T')[0];

        // 1. Get all relevant Journal entries
        const { data: entries } = await supabase.from('accounting_journal')
            .select('*')
            .or('account_md.ilike.343%,account_d.ilike.343%')
            .gte('date', start)
            .lte('date', end);

        if (!entries || entries.length === 0) {
            console.log(`\nPERIOD: ${isoDateRequest} - No Entries`);
            return;
        }

        // 2. Get Document Types for these entries
        const docIds = [...new Set(entries.map(e => e.document_id).filter(Boolean))];

        const { data: docs } = await supabase.from('accounting_documents')
            .select('id, type')
            .in('id', docIds);

        const docTypeMap = new Map();
        docs?.forEach(d => docTypeMap.set(d.id, d.type));

        let inputSum = 0;
        let outputSum = 0;

        console.log(`\nPERIOD: ${isoDateRequest}`);

        entries.forEach(entry => {
            const type = docTypeMap.get(entry.document_id);

            // Log ignored large amounts to check if we are filtering correctly
            if (type === 'bank_statement') {
                // console.log(`  Skipping Bank: ${entry.amount} (${entry.account_md}/${entry.account_d})`);
                return;
            }

            if (entry.account_md.startsWith('343')) {
                inputSum += entry.amount;
            }
            if (entry.account_d.startsWith('343')) {
                outputSum += entry.amount;
            }
        });

        const net = outputSum - inputSum;

        console.log(`  Input  (Claim):   ${inputSum.toFixed(2)}`);
        console.log(`  Output (Liab):    ${outputSum.toFixed(2)}`);
        console.log(`  NET:              ${net.toFixed(2)}`);

        // Target Dec: Input ~10k, Output ~67k, Net ~56k
        if (isoDateRequest === '2025-12') {
            console.log(`  TARGET:           56425.85`);
            console.log(`  DIFF:             ${(net - 56425.85).toFixed(2)}`);
        }
    }

    await getMonth('2025-10');
    await getMonth('2025-11');
    await getMonth('2025-12');
    await getMonth('2026-01');
};

debugVatNoJoin();
