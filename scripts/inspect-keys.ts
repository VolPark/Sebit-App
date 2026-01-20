
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log("--- CONTACTS KEYS ---");
    const { data: contacts } = await supabase.from('accounting_contacts').select('*').limit(1);
    if (contacts && contacts[0]) console.log(Object.keys(contacts[0]).join(', '));
    else console.log("No contacts found.");

    console.log("\n--- DOCUMENTS KEYS ---");
    const { data: docs } = await supabase.from('accounting_documents').select('*').limit(1);
    if (docs && docs[0]) console.log(Object.keys(docs[0]).join(', '));
    else console.log("No docs found.");
}

main().catch(console.error);
