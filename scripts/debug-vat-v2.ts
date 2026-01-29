
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const debugVatExcludingBank = async () => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    async function getMonth(isoDateRequest: string) {
        const start = `${isoDateRequest}-01`;
        const date = new Date(start);
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const end = nextMonth.toISOString().split('T')[0];

        // Fetch all 343 entries
        const { data: entries, error } = await supabase.from('accounting_journal')
            .select(`
                amount, 
                account_md, 
                account_d, 
                date, 
                description,
                document_id,
                accounting_documents!inner(id, type, doc_number)
            `)
            .or('account_md.ilike.343%,account_d.ilike.343%')
            .gte('date', start)
            .lte('date', end);

        if (error) {
            console.error(error);
            return;
        }

        let inputSum = 0;
        let outputSum = 0;

        console.log(`\nPERIOD: ${isoDateRequest}`);

        entries?.forEach(entry => {
            const docType = (entry as any).accounting_documents?.type;

            // Exclude Bank Statements (assuming type 'bank_statement') and maybe others
            // UOL might label them variously. Let's list what we have.
            if (docType === 'bank_statement') return;

            // Also check description for "Úhrada" or similar if type is missing?
            // Ideally rely on document type.

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
    }

    // Check types first to be sure
    const { data: types } = await supabase.from('accounting_documents').select('type').limit(100);
    const uniqueTypes = [...new Set(types?.map(t => t.type))];
    console.log("Document Types:", uniqueTypes);

    await getMonth('2025-10');
    await getMonth('2025-11');
    await getMonth('2025-12');
    await getMonth('2026-01');
};

debugVatExcludingBank();
