
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl);
// console.log('Key:', supabaseKey); // Don't log secret

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching document 2025000017 with SERVICE ROLE KEY...');

    // Test with Service Role
    const { data, error } = await supabase
        .from('accounting_documents')
        .select('*, accounting_mappings(id, amount)')
        .eq('number', '2025000017');

    if (error) {
        console.error('Error (Service Role):', error);
    } else {
        console.log('Data (Service Role):', JSON.stringify(data, null, 2));
    }

    // Attempt with Anon Key to check RLS if I had it, but here I use service role to confirm data exists first.
    // If this works, then it's likely an RLS issue for the frontend client.
}

run();
