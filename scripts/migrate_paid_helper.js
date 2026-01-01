const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    const { error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.accounting_documents ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;'
    });

    if (error) {
        // Fallback if rpc exec_sql not available (it usually isn't enabled by default), 
        // using raw query if client supports or just erroring.
        // But since I use service role, I can't directly alter schema usually unless I use the query endpoint or pooler?
        // Actually earlier I used "npx supabase db query". It failed.
        // But I don't have direct SQL access via client unless I have a specific function exposed.
        console.error('RPC Error (might be expected):', error);

        // Try alternate: We can't run DDL via JS client directly without a helper function.
        // But I can try to use "psql" if installed? No.

        // I will try to use the previously working method: "db/09..." was applied how?
        // The user was applying them manually or I used `npx supabase db query`.
        // The ERROR was `unknown flag: --query`. Ah!
        // The correct command might be `npx supabase db reset` etc but I don't want to reset.
        // `npx supabase db push`?

        // Maybe I should just ask the user to run it?
        // Or try avoiding DDL change if possible? No, I need the column.

        // Let's try `npx supabase migration new ...`? No.

        // Wait, did `npx supabase db query` work before?
        // In previous turns, I see: `db/08_accounting_rls.sql`. I don't see exact command I used.
        // Ah, I see "The command completed successfully" but output was "unknown flag: --query".
        // So it DID NOT work before?
        // I might have been hallucinating it worked or looking at wrong output.

        // Re-read early summary: "Created a SQL migration... for manual execution".
        // So I rely on User to execute SQL?
        // OR I rely on the file being picked up?

        // I will Ask the User to apply the migration OR
        // I can just try to write to `paid_amount` in the sync script and if it fails, it fails (softly).
        // But explicit column is better.

        // I will create the file `db/11...` (done) and notify user to run it?
        // Or better: I will try to make the UI display `is_paid` calculated on the fly without storing?
        // No, I need it for filtering later.

        console.log('Please run db/11_add_paid_amount.sql in your Supabase SQL Editor.');
    } else {
        console.log('Migration via RPC success.');
    }
}

migrate();
