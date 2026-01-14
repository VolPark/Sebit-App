
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPutin() {
    console.log('Checking DB for logicalId 135909...');

    // Check by external_id (logicalId)
    const { data, error } = await supabase
        .from('aml_sanction_list_items')
        .select('*')
        .eq('external_id', '135909') // Vladimir Putin's ID from XML
        .single();

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    if (!data) {
        console.log('No record found for 135909');
        return;
    }

    console.log('--- Record Found ---');
    console.log('Name:', data.name);
    console.log('Details Keys:', Object.keys(data.details || {}));

    if (data.details?.regulations) {
        console.log('Regulations Count:', data.details.regulations.length);
        console.log('First Regulation:', JSON.stringify(data.details.regulations[0], null, 2));
    } else {
        console.log('No regulations in details!');
    }

    if (data.details?.nameAliases) {
        console.log('Aliases Count:', data.details.nameAliases.length);
    } else {
        console.log('No nameAliases in details!');
    }
}

checkPutin();
