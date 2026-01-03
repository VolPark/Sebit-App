import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const year = searchParams.get('year') || new Date().getFullYear().toString();

        // 1. Fetch entries
        const { data: entries, error } = await supabaseAdmin
            .from('accounting_journal')
            .select('account_md, account_d, amount')
            .eq('fiscal_year', year);

        if (error) throw error;

        // 2. Fetch Account Names
        const { data: accountsData } = await supabaseAdmin
            .from('accounting_accounts')
            .select('code, name');

        const accountNames: Record<string, string> = {};
        accountsData?.forEach(acc => {
            accountNames[acc.code] = acc.name;
        });

        // 3. Aggregate Balances
        const balances: Record<string, { md: number; d: number }> = {};
        const addBalance = (account: string, amount: number, side: 'md' | 'd') => {
            if (!account) return;
            if (!balances[account]) balances[account] = { md: 0, d: 0 };
            balances[account][side] += amount;
        };

        entries?.forEach(entry => {
            if (entry.account_md) addBalance(entry.account_md, Number(entry.amount), 'md');
            if (entry.account_d) addBalance(entry.account_d, Number(entry.amount), 'd');
        });

        // 4. Classify Costs (5) and Revenues (6)
        const costs: any[] = [];
        const revenues: any[] = [];

        Object.keys(balances).forEach(account => {
            const firstChar = account.charAt(0);
            const name = accountNames[account] || '';
            const bal = balances[account];
            const net = bal.md - bal.d; // Net Debit Balance (Costs usually +)

            if (['5'].includes(firstChar)) {
                // Costs: Expected Debit Balance (MD > D). Positive net.
                // If net is negative (credit), it's a "negative cost" (e.g. refund/correction), keep sign.
                costs.push({ account, name, balance: net });
            } else if (['6'].includes(firstChar)) {
                // Revenues: Expected Credit Balance (D > MD). Net is negative.
                // We show Revenue as positive number usually. So invert sign.
                revenues.push({ account, name, balance: -net });
            }
        });

        // 5. Sort
        costs.sort((a, b) => a.account.localeCompare(b.account));
        revenues.sort((a, b) => a.account.localeCompare(b.account));

        // 6. Totals
        const totalCosts = costs.reduce((sum, item) => sum + item.balance, 0);
        const totalRevenues = revenues.reduce((sum, item) => sum + item.balance, 0);
        const profit = totalRevenues - totalCosts;

        return NextResponse.json({
            costs,
            revenues,
            totals: {
                costs: totalCosts,
                revenues: totalRevenues,
                profit
            },
            meta: {
                year
            }
        });

    } catch (e: any) {
        console.error('Error calculating profit-loss:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
