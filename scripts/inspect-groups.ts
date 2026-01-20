
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const groups = ['52', '54', '55', '56'];

    for (const group of groups) {
        console.log(`\n--- Inspecting Group ${group} ---`);
        const { data, error } = await supabase
            .from('accounting_journal')
            .select('*')
            .like('account_md', `${group}%`)
            .limit(5);

        if (error) console.error(error);
        else {
            data.forEach(entry => {
                console.log(`Date: ${entry.date}, Acc: ${entry.account_md}, Text: ${entry.text}, Amount: ${entry.amount}`);
            });
        }
    }
}

main();
