
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    console.log("Starting Invoice Linking...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Contacts
    // We need a map of ICO/DIC -> ContactID
    const { data: contacts, error: cError } = await supabase
        .from('accounting_contacts')
        .select('*');

    if (cError) {
        console.error("Error fetching contacts:", cError.message);
        return;
    }

    if (!contacts || contacts.length === 0) {
        console.log("No contacts found. Run sync-contacts.ts first.");
        return;
    }

    const icoMap = new Map<string, string>();
    const dicMap = new Map<string, string>();
    const nameMap = new Map<string, string>(); // Fallback? dangerous.

    contacts.forEach(c => {
        if (c.company_number) icoMap.set(c.company_number.trim(), c.id);
        if (c.vatin) dicMap.set(c.vatin.trim().toUpperCase(), c.id);
        // if (c.name) nameMap.set(c.name.trim().toLowerCase(), c.id);
    });

    console.log(`Loaded ${contacts.length} contacts.`);

    // 2. Fetch Unlinked Documents
    // Fetch docs where contact_id is NULL
    let page = 0;
    const pageSize = 500;
    let totalLinked = 0;

    // Supabase pagination
    while (true) {
        const { data: docs, error: dError } = await supabase
            .from('accounting_documents')
            .select('id, supplier_ico, supplier_dic, supplier_name')
            .is('contact_id', null)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (dError) {
            console.error("Error fetching docs:", dError.message);
            break;
        }

        if (!docs || docs.length === 0) break;

        console.log(`Processing batch ${page + 1}, ${docs.length} docs...`);

        const updates = [];

        for (const doc of docs) {
            let matchedId: string | undefined;

            // Try DIC first
            if (doc.supplier_dic && dicMap.has(doc.supplier_dic.trim().toUpperCase())) {
                matchedId = dicMap.get(doc.supplier_dic.trim().toUpperCase());
            }
            // Try ICO
            else if (doc.supplier_ico && icoMap.has(doc.supplier_ico.trim())) {
                matchedId = icoMap.get(doc.supplier_ico.trim());
            }

            if (matchedId) {
                updates.push({
                    id: doc.id,
                    contact_id: matchedId
                });
            }
        }

        // Perform updates
        // Supabase doesn't support bulk update easily without upserting EVERYTHING.
        // But we only want to update contact_id.
        // We can use upsert if we include all required fields? No, doc might have other fields.
        // We have to update one by one or matching batches. 
        // For efficiency, let's try to group? No, simple loop for now, parallelism.

        // Actually, we can use `upsert` if we strictly only passed the PK + contact_id AND if table allows it?
        // Note: verify if this overwrites other fields with nulls if partial? 
        // Supabase upsert performs an update if PK exists. If we only provide PK and contact_id, 
        // passing `ignoreDuplicates: false` (default) means it updates.
        // BUT if we omit other columns, will it set them to null? 
        // Postgres `INSERT ... ON CONFLICT DO UPDATE SET ...` usually requires specifying what to SET.
        // Supabase JS `upsert` handles this by updating only the columns provided in the object IF it's a "patch" style?
        // Documentation says "Perform an UPSERT on the table." 
        // It's safer to use `update` by ID loop for now to be sure we don't wipe data.

        await Promise.all(updates.map(u =>
            supabase.from('accounting_documents').update({ contact_id: u.contact_id }).eq('id', u.id)
        ));

        totalLinked += updates.length;
        console.log(`  Linked ${updates.length} docs in this batch.`);

        if (docs.length < pageSize) break;
        page++;
    }

    console.log(`Finished. Total Linked: ${totalLinked}`);
}

main().catch(console.error);
