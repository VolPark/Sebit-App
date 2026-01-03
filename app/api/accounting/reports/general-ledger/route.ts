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
        const isPastYear = year < currentYear;
        const cutoffDate = isPastYear
            ? `${year}-12-31`
            : new Date().toISOString().split('T')[0]; // Today YYYY-MM-DD

        // 1. Fetch entries from beginning of time up to cutoff
        const { data: entries, error } = await supabaseAdmin
            .from('accounting_journal')
            .select('*')
            .lte('date', cutoffDate)
            .order('date', { ascending: true }); // Chronological for ledger

        if (error) throw error;

        // 2. Fetch Account Names
        const { data: accountsData } = await supabaseAdmin
            .from('accounting_accounts')
            .select('code, name');

        const accountNames: Record<string, string> = {};
        accountsData?.forEach(acc => {
            accountNames[acc.code] = acc.name;
        });

        // 3. Group by Account
        const ledger: Record<string, {
            account: string;
            name: string;
            initial: number;
            md: number;
            d: number;
            final: number;
            transactions: any[];
        }> = {};

        const getAccountEntry = (acc: string) => {
            if (!ledger[acc]) {
                ledger[acc] = {
                    account: acc,
                    name: accountNames[acc] || accountNames[acc.substring(0, 3)] || '',
                    initial: 0,
                    md: 0,
                    d: 0,
                    final: 0,
                    transactions: []
                };
            }
            return ledger[acc];
        };

        // Process entries for Initial Balance vs Turnover
        entries?.forEach(entry => {
            const amount = Number(entry.amount);
            const entryYear = new Date(entry.date).getFullYear();
            const isPriorYear = entryYear < year;

            // Helper to process line
            const processLine = (accCode: string, side: 'md' | 'd') => {
                const firstChar = accCode.charAt(0);

                // PL Accounts (5-6):
                // - Prior Year -> IGNORE (Closed to Equity in reality, implies 0 initial for this year)
                // - Current Year -> Add to Turnover
                if (['5', '6'].includes(firstChar) && isPriorYear) {
                    return;
                }

                const acc = getAccountEntry(accCode);

                // Add to transactions list regardless of year (User request: show all details)
                // For PL accounts, we already filtered out prior years above, so this only adds current year PL + all BS history.
                if (side === 'md') {
                    acc.transactions.push({ ...entry, side: 'md' });
                } else {
                    acc.transactions.push({ ...entry, side: 'd' });
                }

                if (isPriorYear) {
                    // BS Account Prior -> Initial Balance
                    // If side is 'md', +amount. If 'd', -amount.
                    if (side === 'md') acc.initial += amount;
                    else acc.initial -= amount;
                } else {
                    // Current Year -> Turnover
                    if (side === 'md') {
                        acc.md += amount;
                    } else {
                        acc.d += amount;
                    }
                }
            };

            if (entry.account_md) processLine(entry.account_md, 'md');
            if (entry.account_d) processLine(entry.account_d, 'd');
        });

        // 4. Calculate Final Balances and Filter Zeros
        const result = Object.values(ledger)
            .map(acc => {
                acc.final = acc.initial + acc.md - acc.d;
                return acc;
            })
            // Filter out accounts that are effectively zero everywhere
            .filter(acc => {
                const isZero = (val: number) => Math.abs(val) < 0.01;
                const empty = isZero(acc.initial) && isZero(acc.md) && isZero(acc.d);
                return !empty;
            })
            .sort((a, b) => a.account.localeCompare(b.account));

        return NextResponse.json({
            items: result,
            meta: {
                year,
                totalAccounts: result.length
            }
        });

    } catch (e: any) {
        console.error('Error fetching general ledger:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
