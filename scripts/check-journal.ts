
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data, error } = await supabase
        .from('accounting_journal')
        .select('text')
        .ilike('account_md', '518%')
        .limit(1);

    if (error) console.error(error);
    else console.log('JOURNAL TEXT:', data[0]?.text);
}

check();
