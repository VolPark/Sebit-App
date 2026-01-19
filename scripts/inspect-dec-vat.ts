
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const inspectDecVat = async () => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const start = '2025-12-01';
    const end = '2025-12-31';

    const { data: entries } = await supabase.from('accounting_journal')
        .select('*')
        .or('account_md.ilike.343%,account_d.ilike.343%')
        .gte('date', start)
        .lte('date', end);

    if (!entries) return;

    // Get Doc Types
    const docIds = [...new Set(entries.map(e => e.document_id).filter(Boolean))];
    const { data: docs } = await supabase.from('accounting_documents')
        .select('id, type, doc_number')
        .in('id', docIds);

    const docMap = new Map();
    docs?.forEach(d => docMap.set(d.id, d));

    let output = `\n--- DEC 2025 RAW ENTRIES (${entries.length}) ---\n`;
    output += "MD/D | Account | Amount | DocNumber (Type) | Text\n";

    entries.forEach(e => {
        const d = docMap.get(e.document_id);
        const docInfo = d ? `${d.doc_number} (${d.type})` : 'NO_DOC';

        let side = '?';
        let acc = '?';
        if (e.account_md.startsWith('343')) {
            side = 'MD (Input)';
            acc = e.account_md;
        } else {
            side = 'D  (Output)';
            acc = e.account_d;
        }

        output += `${side} | ${acc} | ${e.amount.toFixed(2).padStart(10)} | ${docInfo} | ${e.text}\n`;
    });

    console.log("Writing to vat_debug_output.txt");
    fs.writeFileSync('c:/Users/Sebek/sebit-app/vat_debug_output.txt', output);
};

inspectDecVat();
