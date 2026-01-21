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
        const yearParam = searchParams.get('year') || new Date().getFullYear().toString();
        const year = Number(yearParam);

        // Determine Cutoff Date
        const currentYear = new Date().getFullYear();
        // If selecting a past year, cutoff is Dec 31 of that year.
        // If selecting current year (or future), cutoff is Today (or just no upper bound? Let's use End of Today to be safe/standard).
        // Actually, user said "V aktuálním roce to bude od pořátku věku až k dnešnímu dni".
        const isPastYear = year < currentYear;
        const cutoffDate = isPastYear
            ? `${year}-12-31`
            : new Date().toISOString().split('T')[0]; // Today YYYY-MM-DD

        // 1. Fetch all journal entries from beginning of time up to cutoff
        // We do NOT filter by fiscal_year='2025' anymore. We fetch everything where date <= cutoff.
        const { data: entries, error } = await supabaseAdmin
            .from('accounting_journal')
            .select('account_md, account_d, amount, date')
            .lte('date', cutoffDate);

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
        // Balances: { account: { md: 0, d: 0 } }
        // Special Handling:
        // - Class 0-4 + 9: Accumulate normally.
        // - Class 5, 6: 
        //   - If entry.date is in Selected Year: Accumulate to Class 5/6 (for Current Profit calc).
        //   - If entry.date < Selected Year: Accumulate to "Retained Earnings" (Virtual 428/429).

        const balances: Record<string, { md: number; d: number }> = {};
        const RETAINED_EARNINGS_ACCOUNT = '428xxx'; // Virtual account for previous years' profit

        const addBalance = (account: string, amount: number, side: 'md' | 'd', date: string) => {
            if (!account) return;

            const firstChar = account.charAt(0);
            const entryYear = new Date(date).getFullYear();

            let targetAccount = account;

            // Logic for Retained Earnings (Profit from previous years)
            if ((firstChar === '5' || firstChar === '6') && entryYear < year) {
                // This is an expense/revenue from a previous closed year.
                // It should be rolled into Retained Earnings.
                // Expenses (Debit) reduce Retained Earnings (Debit side of 428? Or Credit side of 429? Equity is Liability side).
                // Profit = Credit - Debit. 
                // Expenses (Debit) -> Debit 428. Revenue (Credit) -> Credit 428.
                // Actually 428 is "Nerozdělený zisk minulých let". (Passive/Liability).
                // If we treat it as a single equity account, specific MD/D works.
                targetAccount = RETAINED_EARNINGS_ACCOUNT;
            }

            if (!balances[targetAccount]) balances[targetAccount] = { md: 0, d: 0 };
            balances[targetAccount][side] += amount;
        };

        entries?.forEach(entry => {
            if (entry.account_md) addBalance(entry.account_md, Number(entry.amount), 'md', entry.date);
            if (entry.account_d) addBalance(entry.account_d, Number(entry.amount), 'd', entry.date);
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

        let expenseSum = 0; // Class 5 (Current Year)
        let revenueSum = 0; // Class 6 (Current Year)

        let vatSum = 0;

        Object.keys(balances).forEach(account => {
            const net = getNet(account);

            // --- NETTO VAT LOGIC (343xxx) ---
            if (account.startsWith('343')) {
                vatSum += net;
                return; // Skip standard processing
            }

            const firstChar = account.charAt(0);
            const firstTwo = account.substring(0, 2);

            // Name resolution
            let name = accountNames[account] || accountNames[account.substring(0, 3)] || '';
            if (account === RETAINED_EARNINGS_ACCOUNT) name = 'Nerozdělený zisk minulých let';

            // Skip zero balance accounts
            if (Math.abs(net) < 0.01) return;

            if (firstChar === '5') {
                expenseSum += net;
            } else if (firstChar === '6') {
                revenueSum += net;
            } else if (account === RETAINED_EARNINGS_ACCOUNT) {
                // Retained Earnings (Equity)
                // Credit balance (Negative Net) -> Liability A.
                // Debit balance (Positive Net aka Loss) -> Liability A (Negative).
                liabilitiesGroups['A'].accounts.push({ account: '428/429', name, balance: -net }); // Invert because Liabilities are Credit
                liabilitiesGroups['A'].balance += -net;
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

        // 5. Add Netto VAT Result
        if (Math.abs(vatSum) > 0.01) {
            if (vatSum > 0) {
                // Asset side (Excess Deduction) - Group C per user request? 
                // User said: "IF Výsledné saldo < 0 (Nadměrný odpočet): Zobrazit pouze na straně AKTIV v sekci Pohledávky -> Stát - daňové pohledávky."
                // My vatSum > 0 matches this case.
                // Assets Group C is "C. Oběžná aktiva".
                assetsGroups['C'].accounts.push({ account: '343', name: 'Stát - daňové pohledávky', balance: vatSum });
                assetsGroups['C'].balance += vatSum;
            } else {
                // Liability side (Tax Liability) - Group B_C
                // User said: "IF Výsledné saldo > 0 (Dlužíme státu): Zobrazit pouze na straně PASIV v sekci Krátkodobé závazky -> Stát - daňové závazky."
                // My vatSum < 0 matches this case.
                liabilitiesGroups['B_C'].accounts.push({ account: '343', name: 'Stát - daňové závazky', balance: -vatSum });
                liabilitiesGroups['B_C'].balance += -vatSum;
            }
        }

        // 5. Calculate Profit/Loss (Current Year) and Add to Equity
        // Profit = Revenue (Credit) - Expense (Debit)
        // Revenue (Class 6) net is usually negative (Credit). Expense (Class 5) net is positive (Debit).
        // Profit = -(RevenueNet + ExpenseNet)
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
