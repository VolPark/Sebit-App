
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const inspectDoc = async () => {
    const docNumber = process.argv[2];
    if (!docNumber) {
        console.error("Please provide doc number");
        process.exit(1);
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`Inspecting ${docNumber}...`);

    const { data: docs } = await supabase.from('accounting_documents')
        .select('*')
        .eq('doc_number', docNumber);

    if (!docs || docs.length === 0) {
        console.log("Doc not found in documents.");
    } else {
        const d = docs[0];
        console.log("DOCUMENT:");
        console.log(`  ID: ${d.id}`);
        console.log(`  Date (Issue): ${d.date}`);
        console.log(`  Date Tax (DUZP): ${d.date_tax}`);
        console.log(`  Amount: ${d.amount}`);
    }

    // Check Journal
    // We need to match by document_id or text
    // Assuming we found the doc above

    if (docs?.[0]) {
        const { data: journal } = await supabase.from('accounting_journal')
            .select('*')
            .eq('document_id', docs[0].id);

        console.log("\nJOURNAL ENTRIES:");
        journal?.forEach(j => {
            console.log(`  Date: ${j.date} | Acc: ${j.account_md}/${j.account_d} | Amt: ${j.amount} | Text: ${j.text}`);
        });
    }
};

inspectDoc();
