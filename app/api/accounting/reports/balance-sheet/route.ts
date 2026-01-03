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

        // 1. Fetch all journal entries for the year
        const { data: entries, error } = await supabaseAdmin
            .from('accounting_journal')
            .select('account_md, account_d, amount')
            .eq('fiscal_year', year);

        if (error) throw error;

        // 1b. Fetch Account Names
        const { data: accountsData } = await supabaseAdmin
            .from('accounting_accounts')
            .select('code, name');

        const accountNames: Record<string, string> = {};
        accountsData?.forEach(acc => {
            accountNames[acc.code] = acc.name;
        });

        // 2. Aggregate Balances
        const balances: Record<string, { md: number; d: number }> = {};

        // ... (Aggregation logic remains same)

        const addBalance = (account: string, amount: number, side: 'md' | 'd') => {
            if (!account) return;
            if (!balances[account]) balances[account] = { md: 0, d: 0 };
            balances[account][side] += amount;
        };

        entries?.forEach(entry => {
            if (entry.account_md) addBalance(entry.account_md, Number(entry.amount), 'md');
            if (entry.account_d) addBalance(entry.account_d, Number(entry.amount), 'd');
        });

        // 3. Classify and Calculate
        const assets: any[] = [];
        const liabilities: any[] = [];
        let expenseSum = 0; // Class 5
        let revenueSum = 0; // Class 6 (Credit balance usually)

        // Helper to get net balance (MD - D)
        const getNet = (acc: string) => (balances[acc].md - balances[acc].d);

        Object.keys(balances).forEach(account => {
            const net = getNet(account);
            const firstChar = account.charAt(0);
            const name = accountNames[account] || '';

            if (['5'].includes(firstChar)) {
                // Costs
                expenseSum += net; // Usually positive
            } else if (['6'].includes(firstChar)) {
                // Revenues
                revenueSum += net; // Usually negative (Credit)
            } else if (['0', '1', '2'].includes(firstChar)) {
                // Assets
                assets.push({ account, name, balance: net });
            } else if (['4', '9'].includes(firstChar)) {
                // Liabilities (Show as positive for matching side calculation later, or keep sign?)
                // Standard: Liabilities side shows D - MD (Credit Balance).
                liabilities.push({ account, name, balance: -net });
            } else if (['3'].includes(firstChar)) {
                // Mixed Class 3
                if (net >= 0) {
                    assets.push({ account, name, balance: net });
                } else {
                    liabilities.push({ account, name, balance: -net });
                }
            } else {
                // Other? Class 8, 7 (Off-balance)?
                if (net >= 0) assets.push({ account, name, balance: net });
                else liabilities.push({ account, name, balance: -net });
            }
        });

        // 4. Calculate Profit/Loss (Hospodářský výsledek)
        // Profit = Revenue - Expenses. 
        // In terms of Net Balances (MD-D):
        // Revenue (Class 6) has Net < 0. (e.g. -1000).
        // Expense (Class 5) has Net > 0. (e.g. 800).
        // Sum = -200.
        // Profit should be 200.
        // So Profit = - (Sum of 5xx and 6xx).

        const sum5and6 = expenseSum + revenueSum;
        const profit = -sum5and6;

        // Add Profit to Liabilities (Equity)
        // If Profit > 0, it's a Liability (Credit side).
        // If Profit < 0 (Loss), it's a negative Liability (or visible in Assets as Loss).
        // Usually shown in Liabilities section.
        liabilities.push({
            account: 'HV',
            name: 'Hospodářský výsledek ve schvalovacím řízení',
            balance: profit,
            isTotal: true
        });

        // 5. Sort
        assets.sort((a, b) => a.account.localeCompare(b.account));
        liabilities.sort((a, b) => {
            if (a.account === 'HV') return 1; // Put HV at end
            if (b.account === 'HV') return -1;
            return a.account.localeCompare(b.account);
        });

        // 6. Calculate Totals
        const totalAssets = assets.reduce((sum, item) => sum + item.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, item) => sum + item.balance, 0);

        return NextResponse.json({
            assets,
            liabilities,
            totals: {
                assets: totalAssets,
                liabilities: totalLiabilities,
                diff: totalAssets - totalLiabilities // Should be 0
            },
            meta: {
                year
            }
        });

    } catch (e: any) {
        console.error('Error calculating balance sheet:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
