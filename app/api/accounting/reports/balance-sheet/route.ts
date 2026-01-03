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

        const addBalance = (account: string, amount: number, side: 'md' | 'd') => {
            if (!account) return;
            if (!balances[account]) balances[account] = { md: 0, d: 0 };
            balances[account][side] += amount;
        };

        entries?.forEach(entry => {
            if (entry.account_md) addBalance(entry.account_md, Number(entry.amount), 'md');
            if (entry.account_d) addBalance(entry.account_d, Number(entry.amount), 'd');
        });

        // 3. Helper to get net balance (MD - D)
        const getNet = (acc: string) => (balances[acc].md - balances[acc].d);

        // 4. Structure Definition (Simplified Scope)
        // Groups definition
        const assetsGroups = {
            'B': { id: 'B', name: 'B. Stálá aktiva', accounts: [] as any[], balance: 0 },
            'C': { id: 'C', name: 'C. Oběžná aktiva', accounts: [] as any[], balance: 0 },
            'D': { id: 'D', name: 'D. Časové rozlišení (Aktiva)', accounts: [] as any[], balance: 0 }
        };

        const liabilitiesGroups = {
            'A': { id: 'A', name: 'A. Vlastní kapitál', accounts: [] as any[], balance: 0 },
            'B_C': { id: 'B_C', name: 'B.+C. Cizí zdroje', accounts: [] as any[], balance: 0 },
            'D': { id: 'D', name: 'D. Časové rozlišení (Pasiva)', accounts: [] as any[], balance: 0 }
        };

        let expenseSum = 0; // Class 5
        let revenueSum = 0; // Class 6 (Credit balance usually)

        Object.keys(balances).forEach(account => {
            const net = getNet(account);
            const firstChar = account.charAt(0);
            const firstTwo = account.substring(0, 2);
            // Fallback: Try full account, then first 3 digits
            const name = accountNames[account] || accountNames[account.substring(0, 3)] || '';

            // Skip zero balance accounts? Or keep them? Usually keep if movement exists.
            if (Math.abs(net) < 0.01 && balances[account].md === 0 && balances[account].d === 0) return;

            if (firstChar === '5') {
                expenseSum += net;
            } else if (firstChar === '6') {
                revenueSum += net;
            } else if (['0', '1', '2', '3', '4', '9'].includes(firstChar)) {
                // Determine Active/Passive side and Group

                // --- ASSETS LOGIC ---
                // Class 0: Fixed Assets -> Group B
                if (firstChar === '0') {
                    assetsGroups['B'].accounts.push({ account, name, balance: net });
                    assetsGroups['B'].balance += net;
                }
                // Class 1, 2: Current Assets -> Group C
                else if (firstChar === '1' || firstChar === '2') {
                    assetsGroups['C'].accounts.push({ account, name, balance: net });
                    assetsGroups['C'].balance += net;
                }
                // Class 3: Receivables/Payables - mixed logic
                else if (firstChar === '3') {
                    // Specific checking for Accruals (38x)
                    if (firstTwo === '38') {
                        if (net >= 0) {
                            assetsGroups['D'].accounts.push({ account, name, balance: net });
                            assetsGroups['D'].balance += net;
                        } else {
                            liabilitiesGroups['D'].accounts.push({ account, name, balance: -net }); // Shown as positive liability
                            liabilitiesGroups['D'].balance += -net;
                        }
                    }
                    // Standard Receivables (Debit balance) -> Assets C
                    else if (net >= 0) {
                        assetsGroups['C'].accounts.push({ account, name, balance: net });
                        assetsGroups['C'].balance += net;
                    }
                    // Payables (Credit balance) -> Liabilities B+C
                    else {
                        liabilitiesGroups['B_C'].accounts.push({ account, name, balance: -net });
                        liabilitiesGroups['B_C'].balance += -net;
                    }
                }
                // Class 4: Equity / Long-term Liabilities
                else if (firstChar === '4') {
                    // Equity: 41, 42, 43
                    if (['41', '42', '43'].includes(firstTwo)) {
                        // Equity accounts usually Credit balance, so invert net (which is MD-D)
                        liabilitiesGroups['A'].accounts.push({ account, name, balance: -net });
                        liabilitiesGroups['A'].balance += -net;
                    }
                    // Liabilities: 44, 45, 46, 47, ...
                    else {
                        liabilitiesGroups['B_C'].accounts.push({ account, name, balance: -net });
                        liabilitiesGroups['B_C'].balance += -net;
                    }
                }
                // Class 9: Off-balance (ignored in Balance Sheet usually) or specific cases
            }
        });

        // 5. Calculate Profit/Loss (Current Year) and Add to Equity
        // Profit = Revenue (Credit) - Expense (Debit)
        // Revenue (Class 6) net is usually negative (Credit). Expense (Class 5) net is positive (Debit).
        // Profit = -(RevenueNet + ExpenseNet)
        // Example: Rev -1000, Exp +800. Net Sum = -200. Profit = 200.
        const sum5and6 = expenseSum + revenueSum;
        const currentYearProfit = -sum5and6;

        liabilitiesGroups['A'].accounts.push({
            account: 'HV',
            name: 'Výsledek hospodaření běžného účetního období',
            balance: currentYearProfit,
            isTotal: true
        });
        liabilitiesGroups['A'].balance += currentYearProfit;

        // 6. Convert Groups to Arrays and Sort
        const assetsFinal = Object.values(assetsGroups)
            .filter(g => Math.abs(g.balance) > 0 || g.accounts.length > 0)
            .map(g => ({
                ...g,
                accounts: g.accounts.sort((a, b) => a.account.localeCompare(b.account))
            }));

        const liabilitiesFinal = Object.values(liabilitiesGroups)
            .filter(g => Math.abs(g.balance) > 0 || g.accounts.length > 0)
            .map(g => ({
                ...g,
                accounts: g.accounts.sort((a, b) => {
                    if (a.account === 'HV') return 1;
                    if (b.account === 'HV') return -1;
                    return a.account.localeCompare(b.account)
                })
            }));

        // 7. Calculate Grand Totals
        const totalAssets = assetsFinal.reduce((sum, g) => sum + g.balance, 0);
        const totalLiabilities = liabilitiesFinal.reduce((sum, g) => sum + g.balance, 0);

        return NextResponse.json({
            assets: assetsFinal,
            liabilities: liabilitiesFinal,
            totals: {
                assets: totalAssets,
                liabilities: totalLiabilities,
                diff: totalAssets - totalLiabilities
            },
            meta: { year }
        });

    } catch (e: any) {
        console.error('Error calculating balance sheet:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
