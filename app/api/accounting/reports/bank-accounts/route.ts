import { NextResponse } from 'next/server';
import { UolClient } from '@/lib/accounting/uol-client';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data: provider, error } = await supabaseAdmin
            .from('accounting_providers')
            .select('config')
            .eq('code', 'uol')
            .single();

        if (error || !provider) {
            return NextResponse.json({ error: "UOL configuration not found" }, { status: 404 });
        }

        const config = provider.config as any;
        if (!config?.email || !config?.apiKey) {
            return NextResponse.json({ error: "UOL credentials missing in DB config" }, { status: 401 });
        }

        const client = new UolClient({
            baseUrl: config.baseUrl || 'https://api.uol.cz',
            email: config.email,
            apiKey: config.apiKey
        });

        // 1. Fetch List from UOL (to get current accounts presence and opening balances)
        const list = await client.getBankAccounts();
        const items = list.items || [];

        // 1b. Fetch Custom Names from DB
        const { data: customNames } = await supabaseAdmin
            .from('accounting_bank_accounts')
            .select('bank_account_id, custom_name');

        const nameMap: Record<string, string> = {};
        customNames?.forEach((row: any) => {
            nameMap[row.bank_account_id] = row.custom_name;
        });

        // 2. Fetch Details and Calculate Balance from DB Cache
        const accountsWithDetails = await Promise.all(items.map(async (acc: any) => {
            try {
                if (!acc.bank_account_id) return acc;

                // Fetch detail from UOL for opening balance
                // Optimization: Maybe store this in DB too? For now UOL is fast for single items.
                const detail = await client.getBankAccountDetail(acc.bank_account_id);

                // Calculate movements sum from DB
                // This is much faster than fetching full history from UOL
                const { data: movementsSum, error: sumError } = await supabaseAdmin
                    .rpc('get_bank_movements_sum', { account_id: acc.bank_account_id });

                // If RPC doesn't exist, we might need to select and sum in JS (slower but works without RPC)
                // Let's fallback to select sum.
                let dbSum = 0;

                // Supabase doesn't have direct .sum() in JS client easily without grouping.
                // We can fetch all amounts (lightweight) or creating an RPC is better.
                // Let's create RPC in the migration or just fetch all amounts.
                // Fetching 5000 amounts is better than 5000 full objects from external API.

                const { data: amounts } = await supabaseAdmin
                    .from('accounting_bank_movements')
                    .select('amount')
                    .eq('bank_account_id', acc.bank_account_id);

                if (amounts) {
                    dbSum = amounts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                }

                const openingBalance = parseFloat(detail.opening_balance || '0');
                const currentBalance = openingBalance + dbSum;

                return {
                    ...acc,
                    ...detail,
                    ...detail,
                    balance: currentBalance,
                    custom_name: nameMap[acc.bank_account_id] || null
                };
            } catch (e) {
                console.error(`Failed to fetch details/movements for account ${acc.bank_account_id}`, e);
                return acc; // Fallback to basic info
            }
        }));

        return NextResponse.json({ ...list, items: accountsWithDetails });
    } catch (e: any) {
        console.error('Error fetching bank accounts:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
