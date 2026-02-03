import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();

    try {
        const { searchParams } = new URL(req.url);
        const yearParam = searchParams.get('year') || new Date().getFullYear().toString();
        const account = searchParams.get('account');
        const year = Number(yearParam);

        if (!account) {
            return NextResponse.json({ error: 'Account is required' }, { status: 400 });
        }

        // 1. Fetch Journal Entries for this account
        // We look for Debit (MD) side for costs (Class 5).
        // Technically could be Credit (D) for corrections, but usually MD.
        // We will fetch where either matches.

        const { data: entries, error } = await supabaseAdmin
            .from('accounting_journal')
            .select('*')
            .eq('fiscal_year', year)
            .or(`account_md.eq.${account},account_d.eq.${account}`);

        if (error) throw error;

        // 2. Extract Doc Numbers
        const docNumbers = new Set<string>();
        const entryMap = new Map<string, any[]>(); // doc_number -> entries

        entries?.forEach(entry => {
            // Parse doc_number from text " | DOC:12345"
            const match = entry.text?.match(/\| DOC:(\d+)/);
            if (match && match[1]) {
                const docNum = match[1];
                docNumbers.add(docNum);

                if (!entryMap.has(docNum)) entryMap.set(docNum, []);
                entryMap.get(docNum)?.push(entry);
            }
        });

        if (entries && entries.length > 0) {
            console.log(`[DetailAPI] Found ${entries.length} items for ${account}`);
            console.log(`[DetailAPI] Sample Text: '${entries[0].text}'`);
            const matchSample = entries[0].text?.match(/\| DOC:(\d+)/);
            console.log(`[DetailAPI] Regex Match:`, matchSample);
        }

        // 3. Fetch Documents
        // Since we can't do "IN" query on JSON field easily, and the list might be large,
        // we might just fetch ALL purchase invoices for the year if the list is large,
        // OR fetch filtered by date range if possible.
        // But docNumbers size is limited by the number of journal entries for *this specific account*,
        // typically < 50 for a specific service type.
        // Filtering by `raw_data->>doc_number` with `in` is not standard Supabase JS syntax yet (filter('raw_data->>doc_number', 'in', ...)).
        // We can use Text Search or just fetch broad range.
        // Better: Fetch `accounting_documents` that are likely candidates (Purchase Invoices).
        // Since `accounting_documents` table is small (~200 total invoices per year typically for this size),
        // fetching all Purchase Invoices for the year is highly efficient.

        const { data: docs } = await supabaseAdmin
            .from('accounting_documents')
            .select('id, supplier_name, supplier_ico, raw_data, number, external_id, issue_date, contact:accounting_contacts(name, company_number)') // number is VS
            .eq('type', 'purchase_invoice')
            .gte('issue_date', `${year}-01-01`)
            .lte('issue_date', `${year}-12-31`);

        // 4. Map Documents to Entries
        // Build Doc Map by doc_number (internal)
        const docLookup = new Map<string, any>();
        docs?.forEach(d => {
            // Strict match: DOC:xxx in journal refers to external_id (Invoice ID) in documents
            // DO NOT index by 'number' (VS), as it causes collisions (e.g. DOC:100 vs VS:100)
            if (d.external_id) docLookup.set(String(d.external_id), d);
            if (d.raw_data?.id) docLookup.set(String(d.raw_data.id), d); // additional fallback if external_id missing
            if (d.raw_data?.doc_number) docLookup.set(String(d.raw_data.doc_number), d);
        });

        // 5. Build Result List
        const resultItems = entries?.map(entry => {
            let supplierName = null;
            let supplierIco = null;
            let docInfo = null;

            // Only attempt invoice lookup for groups that essentially contain invoices (50, 51, 53)
            // Groups 52 (Wages), 54 (Other), 55 (Depreciation), 56 (Financial) often contain internal docs 
            // that share IDs/VS with invoices (e.g. rounding diffs), leading to confusing matches.
            const accountGroup = account.substring(0, 2);
            const shouldLookup = ['50', '51', '53'].includes(accountGroup);

            if (shouldLookup) {
                const match = entry.text?.match(/\| DOC:(\d+)/);
                if (match && match[1]) {
                    const docNum = match[1];
                    const doc = docLookup.get(docNum);
                    if (doc) {
                        // Prioritize linked contact name
                        if (doc.contact && (doc.contact as any).name) {
                            supplierName = (doc.contact as any).name;
                        } else {
                            supplierName = doc.supplier_name;
                        }
                        supplierIco = (doc.contact as any)?.company_number || doc.supplier_ico;
                        docInfo = doc;
                    }
                }
            }

            // Determine effective amount for this account
            // If account is MD, amount is positive cost. 
            // If account is D, amount is negative cost (correction).
            let amount = Number(entry.amount);
            if (entry.account_d === account) amount = -amount;

            let effectiveSupplier = supplierName;

            // Refine "Unknown" for specific logical groups
            if (!effectiveSupplier || effectiveSupplier === 'Neznámý dodavatel') {
                if (accountGroup === '52') effectiveSupplier = 'Mzdy / Zaměstnanci';
                else if (accountGroup === '55') effectiveSupplier = 'Interní doklad (Odpisy/Rezervy)';
                else if (accountGroup === '56') effectiveSupplier = 'Banka / Poplatky';
                else if (accountGroup === '54') effectiveSupplier = 'Provozní náklady';
                else if (accountGroup === '50' || accountGroup === '51' || accountGroup === '53') effectiveSupplier = 'Neznámý dodavatel';
                else effectiveSupplier = 'Interní doklad';
            }

            return {
                date: entry.date,
                text: entry.text.replace(/\| DOC:\d+/, '').trim(), // Clean text
                amount: amount,
                supplier: effectiveSupplier,
                ico: supplierIco,
                doc_vs: docInfo?.number // VS
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({
            account,
            year,
            items: resultItems
        });

    } catch (e: any) {
        console.error('Error in detail report:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
