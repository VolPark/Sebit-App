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
            .select('*')
            .eq('fiscal_year', year)
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
                    initial: 0, // In future: fetch from previous year closing
                    md: 0,
                    d: 0,
                    final: 0,
                    transactions: []
                };
            }
            return ledger[acc];
        };

        entries?.forEach(entry => {
            const amount = Number(entry.amount);

            // MD Side
            if (entry.account_md) {
                const acc = getAccountEntry(entry.account_md);
                acc.md += amount;
                acc.transactions.push({ ...entry, side: 'md' });
            }

            // D Side
            if (entry.account_d) {
                const acc = getAccountEntry(entry.account_d);
                acc.d += amount;
                acc.transactions.push({ ...entry, side: 'd' });
            }
        });

        // 4. Calculate Final Balances
        const result = Object.values(ledger).map(acc => {
            // Logic for Balance Calculation depends on Account Type usually,
            // but simplified: Active Accounts = Init + MD - D, Passive = Init + D - MD.
            // For universal view, we can just return MD and D sums, but Final Balance is tricky without knowing Type.
            // However, usually Ledger displays just "Balance" which is signed, or separate Active/Passive columns.
            // Let's use simple Net Balance: MD - D.
            // If Net is positive => Debit balance. If negative => Credit balance.

            acc.final = acc.initial + acc.md - acc.d;
            return acc;
        }).sort((a, b) => a.account.localeCompare(b.account));

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
