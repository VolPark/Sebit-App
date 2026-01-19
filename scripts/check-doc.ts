
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data: docs } = await supabase
        .from('accounting_documents')
        .select('id, number, raw_data');

    // Look for 2025000051 in any field
    const target = '2025000051'; // Example from previous output guess

    const found = docs?.find(d =>
        String(d.number).includes('51') ||
        JSON.stringify(d.raw_data).includes('51')
    );

    if (found) {
        console.log('Found Document:', found.number);
        console.log('Raw Data ID:', found.raw_data.id);
        console.log('Raw Data DocNum:', found.raw_data.doc_number);
    } else {
        console.log('Document not found.');
    }
}

check();
