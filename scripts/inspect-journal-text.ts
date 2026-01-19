
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const inspectJournalByText = async () => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log("Searching for journal entry with text '%2025000078%'...");

    const { data: entries } = await supabase.from('accounting_journal')
        .select('*')
        .ilike('text', '%2025000078%');

    if (!entries || entries.length === 0) {
        console.log("No entries found.");
        return;
    }

    entries.forEach(e => {
        console.log(`ID: ${e.id}`);
        console.log(`Date: ${e.date}`);
        console.log(`MD: ${e.account_md} / D: ${e.account_d}`);
        console.log(`Amount: ${e.amount}`);
        console.log(`Text: ${e.text}`);
        console.log(`Doc ID: ${e.document_id}`);
    });
};

inspectJournalByText();
