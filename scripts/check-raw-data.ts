
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data } = await supabase
        .from('accounting_documents')
        .select('raw_data')
        .limit(1);

    console.log('RAW DATA:', JSON.stringify(data?.[0]?.raw_data, null, 2));
}

check();
