
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log("--- CONTACTS SAMPLE ---");
    const { data: contacts, error: cErr } = await supabase.from('accounting_contacts').select('*').limit(1);
    if (cErr) console.error(cErr);
    else console.log(JSON.stringify(contacts[0], null, 2));

    console.log("\n--- DOCUMENTS SAMPLE ---");
    const { data: docs, error: dErr } = await supabase.from('accounting_documents').select('*').limit(1);
    if (dErr) console.error(dErr);
    else console.log(JSON.stringify(docs[0], null, 2));
}

main().catch(console.error);
