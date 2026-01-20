
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // List all tables
    const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        // Fallback if direct access to information_schema is restricted (common in some setups)
        // Try to select from a hypothetical 'accounting_contacts' to see if it errors
        console.log("Could not list tables from information_schema. Checking specific tables...");
        const { error: contactError } = await supabase.from('accounting_contacts').select('count', { count: 'exact', head: true });
        if (contactError) console.log("accounting_contacts table likely does not exist:", contactError.message);
        else console.log("accounting_contacts table EXISTS.");

        const { error: docError } = await supabase.from('accounting_documents').select('count', { count: 'exact', head: true });
        if (docError) console.log("accounting_documents table likely does not exist:", docError.message);
        else console.log("accounting_documents table EXISTS.");

    } else {
        console.log("Tables in public schema:");
        tables.forEach((t: any) => console.log(t.table_name));
    }
}

main().catch(console.error);
