
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const inspectJanVat = async () => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const start = '2026-01-01';
    const end = '2026-01-31';

    console.log("Fetching Jan 2026 VAT entries (MD 343)...");

    const { data: entries } = await supabase.from('accounting_journal')
        .select('*')
        .ilike('account_md', '343%')
        .gte('date', start)
        .lte('date', end);

    if (!entries) return;

    // Get Doc Info
    const docIds = [...new Set(entries.map(e => e.document_id).filter(Boolean))];
    const { data: docs } = await supabase.from('accounting_documents')
        .select('id, type, doc_number')
        .in('id', docIds);

    const docMap = new Map();
    docs?.forEach(d => docMap.set(d.id, d));

    console.log(`\n--- JAN 2026 INPUT VAT ENTRIES (${entries.length}) ---`);
    console.log("Amount | DocNumber | Text");

    let sum = 0;
    entries.forEach(e => {
        const d = docMap.get(e.document_id);
        const docInfo = d ? `${d.doc_number}` : 'NO_DOC';
        console.log(`${e.amount.toFixed(2).padStart(10)} | ${docInfo} | ${e.text}`);
        sum += e.amount;
    });

    console.log("\nTOTAL MY SYSTEM: ", sum.toFixed(2));
    console.log("TOTAL UOL (Target): 4890.39");
    console.log("MISSING:            ", (4890.39 - sum).toFixed(2));
};

inspectJanVat();
