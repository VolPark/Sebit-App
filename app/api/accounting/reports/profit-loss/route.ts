import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Security: Verify user session
    const session = await verifySession(req);
    if (!session) {
        return unauthorizedResponse();
    }

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

        // 4. Structure Definition (Simplified Scope)
        // Groups definition
        const operatingRevenues = {
            'I': { id: 'I', name: 'I. Tržby z prodeje a výkony', accounts: [] as any[], balance: 0 },
            'II': { id: 'II', name: 'II. Tržby za prodej zboží', accounts: [] as any[], balance: 0 },
            'III': { id: 'III', name: 'III. Ostatní provozní výnosy', accounts: [] as any[], balance: 0 }
        };
        const operatingCosts = {
            'A': { id: 'A', name: 'A. Výkonová spotřeba', accounts: [] as any[], balance: 0 },
            'B': { id: 'B', name: 'B. Změna stavu zásob', accounts: [] as any[], balance: 0 },
            'C': { id: 'C', name: 'C. Osobní náklady', accounts: [] as any[], balance: 0 },
            'D': { id: 'D', name: 'D. Úpravy hodnot v provozní oblasti', accounts: [] as any[], balance: 0 },
            'E': { id: 'E', name: 'E. Ostatní provozní náklady', accounts: [] as any[], balance: 0 }
        };

        const financialRevenues = {
            'IV_VII': { id: 'IV_VII', name: 'IV.-VII. Finanční výnosy', accounts: [] as any[], balance: 0 }
        };
        const financialCosts = {
            'F_K': { id: 'F_K', name: 'F.-K. Finanční náklady', accounts: [] as any[], balance: 0 }
        };

        const taxCosts = {
            'L': { id: 'L', name: 'L. Daň z příjmů', accounts: [] as any[], balance: 0 }
        };

        Object.keys(balances).forEach(account => {
            // Helper to get net balance (MD - D)
            const bal = balances[account];
            const net = bal.md - bal.d;

            // Fallback name
            const name = accountNames[account] || accountNames[account.substring(0, 3)] || '';
            const firstTwo = account.substring(0, 2);
            const firstThree = account.substring(0, 3);
            const firstChar = account.charAt(0);

            // Skip zero balance accounts
            if (Math.abs(net) < 0.01) return;

            // Logic:
            // Revenues (Class 6): Net is usually negative (Credit). We display as Positive for "Revenue" sections.
            // Costs (Class 5): Net is usually positive (Debit). We display as Positive for "Cost" sections.
            // Result = Revenue - Cost.

            if (firstChar === '6') {
                // Revenue -> Invert Sign to show positive amount in UI
                const amount = -net;

                // Classification
                if (account === '604') {
                    operatingRevenues['II'].accounts.push({ account, name, balance: amount });
                    operatingRevenues['II'].balance += amount;
                } else if (['60', '64'].includes(firstTwo)) {
                    // 601, 602 -> I.
                    // 64 -> III.
                    if (firstThree.startsWith('60')) {
                        operatingRevenues['I'].accounts.push({ account, name, balance: amount });
                        operatingRevenues['I'].balance += amount;
                    } else {
                        operatingRevenues['III'].accounts.push({ account, name, balance: amount });
                        operatingRevenues['III'].balance += amount;
                    }
                } else if (['66'].includes(firstTwo)) {
                    financialRevenues['IV_VII'].accounts.push({ account, name, balance: amount });
                    financialRevenues['IV_VII'].balance += amount;
                } else {
                    // Default to Operating Other if not financial
                    operatingRevenues['III'].accounts.push({ account, name, balance: amount });
                    operatingRevenues['III'].balance += amount;
                }

            } else if (firstChar === '5') {
                // Cost -> Keep sign (Positive)
                const amount = net;

                if (['50', '51'].includes(firstTwo)) {
                    operatingCosts['A'].accounts.push({ account, name, balance: amount });
                    operatingCosts['A'].balance += amount;
                } else if (['52'].includes(firstTwo)) {
                    operatingCosts['C'].accounts.push({ account, name, balance: amount });
                    operatingCosts['C'].balance += amount;
                } else if (['53', '54'].includes(firstTwo)) {
                    operatingCosts['E'].accounts.push({ account, name, balance: amount });
                    operatingCosts['E'].balance += amount;
                } else if (['55'].includes(firstTwo)) {
                    operatingCosts['D'].accounts.push({ account, name, balance: amount });
                    operatingCosts['D'].balance += amount;
                } else if (['56', '57'].includes(firstTwo)) {
                    financialCosts['F_K'].accounts.push({ account, name, balance: amount });
                    financialCosts['F_K'].balance += amount;
                } else if (['59'].includes(firstTwo)) {
                    taxCosts['L'].accounts.push({ account, name, balance: amount });
                    taxCosts['L'].balance += amount;
                } else { // 58?
                    // 58 is Activation (Revenue side usually or Cost reduction) or Change in Inventory
                    operatingCosts['B'].accounts.push({ account, name, balance: amount });
                    operatingCosts['B'].balance += amount;
                }
            }
        });

        // Sort Groups
        const sortAccounts = (groups: any) => {
            return Object.values(groups)
                .filter((g: any) => Math.abs(g.balance) > 0 || g.accounts.length > 0)
                .map((g: any) => ({
                    ...g,
                    accounts: g.accounts.sort((a: any, b: any) => a.account.localeCompare(b.account))
                }));
        };

        const opRevFinal = sortAccounts(operatingRevenues);
        const opCostFinal = sortAccounts(operatingCosts);
        const finRevFinal = sortAccounts(financialRevenues);
        const finCostFinal = sortAccounts(financialCosts);
        const taxFinal = sortAccounts(taxCosts);

        // Calculate Results
        const totalOpRev = opRevFinal.reduce((sum, g) => sum + g.balance, 0);
        const totalOpCost = opCostFinal.reduce((sum, g) => sum + g.balance, 0);
        const operatingResult = totalOpRev - totalOpCost;

        const totalFinRev = finRevFinal.reduce((sum, g) => sum + g.balance, 0);
        const totalFinCost = finCostFinal.reduce((sum, g) => sum + g.balance, 0);
        const financialResult = totalFinRev - totalFinCost;

        const resultBeforeTax = operatingResult + financialResult;

        const totalTax = taxFinal.reduce((sum, g) => sum + g.balance, 0);
        const resultAfterTax = resultBeforeTax - totalTax;

        return NextResponse.json({
            operating: {
                revenues: opRevFinal,
                costs: opCostFinal,
                result: operatingResult
            },
            financial: {
                revenues: finRevFinal,
                costs: finCostFinal,
                result: financialResult
            },
            tax: {
                costs: taxFinal,
                total: totalTax
            },
            results: {
                beforeTax: resultBeforeTax,
                afterTax: resultAfterTax
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
