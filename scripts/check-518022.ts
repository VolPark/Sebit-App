
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    console.log('Checking Account 518022...');
    const { data: entries } = await supabase
        .from('accounting_journal')
        .select('date, text, amount')
        .or('account_md.eq.518022,account_d.eq.518022')
        .order('date', { ascending: false })
        .limit(5);

    console.log(entries);
}

check();
