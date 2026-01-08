
const { createClient } = require('@supabase/supabase-js');
// Load env vars from .env.local manually since we don't have dotenv
const fs = require('fs');
const path = require('path');

try {
    const envConfig = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8');
    const lines = envConfig.split('\n');
    lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let val = parts.slice(1).join('=').trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            process.env[key] = val;
        }
    });
} catch (e) {
    console.error("Could not read .env.local", e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
    const { data, error } = await supabase
        .from('accounting_documents')
        .select('manually_paid')
        .limit(1);

    if (error) {
        console.error("Migration NOT applied. Error:", error.message);
        process.exit(1);
    } else {
        console.log("Migration APPLIED. Column exists.");
        process.exit(0);
    }
}

checkColumn();
