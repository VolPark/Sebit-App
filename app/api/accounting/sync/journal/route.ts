import { NextRequest, NextResponse } from 'next/server';
import { UolClient } from '@/lib/accounting/uol-client';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/api/auth';
import { yearParamSchema } from '@/lib/api/schemas';

import { getErrorMessage } from '@/lib/errors';
const log = logger.sync.child('JournalSync');

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

export async function POST(req: NextRequest) {
    // Security: Require either CRON_SECRET (for cron jobs) OR user session (for manual sync)
    const authHeader = req.headers.get('Authorization');
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const session = await verifySession(req);

    if (!isCronAuth && !session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

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
        const url = new URL(req.url);
        const yearRaw = url.searchParams.get('year') || new Date().getFullYear().toString();
        const yearResult = yearParamSchema.safeParse(yearRaw);
        if (!yearResult.success) {
            return NextResponse.json({ error: 'Invalid year parameter', details: yearResult.error.flatten().fieldErrors }, { status: 400 });
        }
        const year = yearResult.data;

        const start = `${year}-01-01`;
        const end = `${year}-12-31`;

        // 3. Fetch Loop
        let page = 1;
        let totalSynced = 0;
        const seenIds = new Set<string>();

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
            const payload = items.map((item: any) => {
                const uolId = String(item.id);
                seenIds.add(uolId);

                return {
                    uol_id: uolId,
                    date: item.date,
                    account_md: item.account_md || item.debit_account || '',
                    account_d: item.account_d || item.credit_account || '',
                    amount: parseFloat(item.amount || '0'),
                    currency: 'CZK',
                    text: item.text || item.description,
                    fiscal_year: year
                };
            });

            // Upsert (on conflict uol_id update)
            const { error: upsertError } = await supabaseAdmin
                .from('accounting_journal')
                .upsert(payload, { onConflict: 'uol_id' });

            if (upsertError) throw upsertError;

            totalSynced += items.length;
            if (!res._meta.pagination?.next) break;
            page++;
        }

        // 5. Cleanup Deleted Records (Soft Deletion / Hard Deletion Sync)
        // Fetch all local UOL IDs for this year to compare
        const { data: localRecords } = await supabaseAdmin
            .from('accounting_journal')
            .select('uol_id')
            .eq('fiscal_year', year);

        const localIds = localRecords?.map(r => r.uol_id) || [];
        const idsToDelete = localIds.filter(id => !seenIds.has(id));

        let deletedCount = 0;
        if (idsToDelete.length > 0) {
            log.info(`Found ${idsToDelete.length} records to delete (not in source).`);

            // Delete in batches to avoid URL limits if many
            const BATCH_SIZE = 50;
            for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
                const batch = idsToDelete.slice(i, i + BATCH_SIZE);
                const { error: delError } = await supabaseAdmin
                    .from('accounting_journal')
                    .delete()
                    .in('uol_id', batch);

                if (delError) log.error('Error deleting batch:', delError);
            }
            deletedCount = idsToDelete.length;
        }

        return NextResponse.json({
            success: true,
            synced: totalSynced,
            deleted: deletedCount,
            period: year
        });

    } catch (e: unknown) {
        log.error('Error syncing journal:', e);
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
