const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data } = await supabase
        .from('accounting_documents')
        .select('status');

    if (data) {
        const statuses = [...new Set(data.map(d => d.status))];
        console.log('Unique JSON statuses:', statuses);
    }
}

inspect();
