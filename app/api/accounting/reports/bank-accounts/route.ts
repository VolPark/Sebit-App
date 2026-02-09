import { NextRequest, NextResponse } from 'next/server';
import { AccountingService } from '@/lib/accounting/service';
import { createClient } from '@supabase/supabase-js';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';
import { z } from 'zod';

import { getErrorMessage } from '@/lib/errors';
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
        const querySchema = z.object({ refresh: z.enum(['true', 'false']).optional() });
        const parsed = querySchema.safeParse({ refresh: searchParams.get('refresh') || undefined });
        const forceRefresh = parsed.success && parsed.data.refresh === 'true';

        // 1. Check DB first (unless forced refresh)
        if (!forceRefresh) {
            const { data: cachedAccounts, error: dbError } = await supabaseAdmin
                .from('accounting_bank_accounts')
                .select('*')
                .order('name'); // or custom_name

            // Start check: Ensure we have at least one account AND that it has the expected schema (account_number)
            const isCacheValid = cachedAccounts && cachedAccounts.length > 0 && cachedAccounts[0].account_number !== undefined;

            if (!dbError && isCacheValid) {
                // Calculate balances using cached movements
                const accounts = await Promise.all(cachedAccounts.map(async (acc) => {
                    // Get sum of movements
                    // Try RPC first, fallback to manual sum if migration not run yet? 
                    // Let's assume migration is run or use safe JS sum.

                    const { data: movements } = await supabaseAdmin
                        .from('accounting_bank_movements')
                        .select('amount')
                        .eq('bank_account_id', acc.bank_account_id);

                    const dbSum = movements?.reduce((sum, m) => sum + (Number(m.amount) || 0), 0) || 0;
                    const opening = Number(acc.opening_balance || 0);

                    return {
                        ...acc,
                        // Compatibility with frontend expectation
                        id: acc.bank_account_id,
                        balance: opening + dbSum,
                        bank_account: acc.account_number,
                        // Ensure currency object or string matches frontend
                        currency: acc.currency ? { currency_id: acc.currency } : 'CZK'
                    };
                }));

                return NextResponse.json({ items: accounts, source: 'cache' });
            }
        }

        // 2. Sync from UOL (If refresh or empty DB)
        const service = await AccountingService.init('uol');
        const { items: syncedItems } = await service.syncBankAccountsMetadata();

        // After sync, re-fetch from DB to ensure consistent return structure from cache logic
        const { data: cachedAccountsAfterSync } = await supabaseAdmin
            .from('accounting_bank_accounts')
            .select('*')
            .order('name');

        // Fallback: If DB fetch returned empty or INCOMPLETE data (e.g. valid rows but missing columns due to migration issues), 
        // use the items we just synced in memory.
        const cachedHasData = cachedAccountsAfterSync && cachedAccountsAfterSync.length > 0 && cachedAccountsAfterSync[0].account_number !== undefined;

        const sourceData = cachedHasData
            ? cachedAccountsAfterSync
            : syncedItems;

        const accountsWithDetails = await Promise.all((sourceData || []).map(async (acc) => {
            const { data: movements } = await supabaseAdmin
                .from('accounting_bank_movements')
                .select('amount')
                .eq('bank_account_id', acc.bank_account_id);

            const dbSum = movements?.reduce((sum, m) => sum + (Number(m.amount) || 0), 0) || 0;
            const opening = Number(acc.opening_balance || 0);

            return {
                ...acc,
                id: acc.bank_account_id,
                balance: opening + dbSum,
                bank_account: acc.account_number,
                currency: acc.currency ? { currency_id: acc.currency } : 'CZK',
                // Return UOL structure compatibility if needed, but UI seems to prioritize DB fields now
                bank_account_id: acc.bank_account_id
            };
        }));

        // Return mostly compatible structure
        return NextResponse.json({ items: accountsWithDetails, source: 'network' });
    } catch (e: unknown) {
        console.error('Error fetching bank accounts:', e);
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
