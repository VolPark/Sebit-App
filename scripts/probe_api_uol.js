const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
    // Probe api.uol.cz directly
    const url = 'https://api.uol.cz/v1/services';
    // or just root
    console.log(`Fetching https://api.uol.cz/ ...`);
    try {
        const res = await fetch('https://api.uol.cz/');
        console.log(`Root Status: ${res.status}`);
        if (res.ok) console.log(await res.text().then(t => t.substring(0, 200)));
    } catch (e) { console.error(e.message); }

    try {
        const res = await fetch('https://api.uol.cz/v1');
        console.log(`V1 Status: ${res.status}`);
        if (res.ok) console.log(await res.json());
    } catch (e) { console.error(e.message); }
}

probe();
