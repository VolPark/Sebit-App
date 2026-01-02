import { NextResponse } from 'next/server';
import { UolClient } from '@/lib/accounting/uol-client';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

export async function POST() {
    try {
        // 1. Get Config
        const { data: provider, error } = await supabaseAdmin
            .from('accounting_providers')
            .select('config')
            .eq('code', 'uol')
            .single();

        if (error || !provider) {
            return NextResponse.json({ error: "UOL configuration not found" }, { status: 404 });
        }

        const config = provider.config as any;
        const client = new UolClient({
            baseUrl: config.baseUrl || 'https://api.uol.cz',
            email: config.email,
            apiKey: config.apiKey
        });

        // 2. Determine Date Range
        // Ideally we sync incrementally. For now, let's sync current year + last year?
        // Or get last synced date from DB?
        // Let's safe sync current year for now.
        const year = new Date().getFullYear();
        const start = `${year}-01-01`;
        const end = `${year}-12-31`;

        // 3. Fetch Loop
        let page = 1;
        let totalSynced = 0;
        let info = "";

        while (true) {
            const res = await client.getAccountingRecords({
                date_from: start,
                date_to: end,
                page: page,
                per_page: 100
            });
            const items = res.items || [];
            if (items.length === 0) break;

            // 4. Transform & Insert
            const payload = items.map((item: any) => ({
                uol_id: String(item.id), // Assuming ID exists
                date: item.date,
                account_md: item.account_md || item.debit_account || '', // Verify field names
                account_d: item.account_d || item.credit_account || '',
                amount: parseFloat(item.amount || '0'),
                currency: 'CZK', // Usually CZK in General Ledger locally
                text: item.text || item.description,
                fiscal_year: year
            }));

            // Upsert (on conflict uol_id update)
            const { error: upsertError } = await supabaseAdmin
                .from('accounting_journal')
                .upsert(payload, { onConflict: 'uol_id' });

            if (upsertError) throw upsertError;

            totalSynced += items.length;
            if (!res._meta.pagination?.next) break;
            page++;
        }

        return NextResponse.json({ success: true, synced: totalSynced, period: year });
    } catch (e: any) {
        console.error('Error syncing journal:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
