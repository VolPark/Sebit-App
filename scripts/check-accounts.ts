
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    console.log('--- Checking Accounting Accounts ---');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) { return; }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: accounts } = await supabase
        .from('accounting_providers')
        .select('*')
        .limit(1);

    console.log('Provider Data:', accounts);
}

main();
