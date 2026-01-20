
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Count linked docs
    const { count: linkedCount } = await supabase
        .from('accounting_documents')
        .select('id', { count: 'exact', head: true })
        .not('contact_id', 'is', null);

    // Count unlinked docs
    const { count: unlinkedCount } = await supabase
        .from('accounting_documents')
        .select('id', { count: 'exact', head: true })
        .is('contact_id', null);

    console.log(`Linked Documents: ${linkedCount}`);
    console.log(`Unlinked Documents: ${unlinkedCount}`);

    if (linkedCount! > 0) {
        // Show sample
        const { data: sample } = await supabase
            .from('accounting_documents')
            .select(`
                id,
                supplier_name,
                contact_id,
                accounting_contacts ( name, company_number )
            `)
            .not('contact_id', 'is', null)
            .limit(3);

        console.log("\nSample Linked Docs:");
        console.log(JSON.stringify(sample, null, 2));
    }
}

main().catch(console.error);
