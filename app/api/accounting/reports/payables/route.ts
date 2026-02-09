import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/errors';
// Zod: No user input to validate (fetches current balance across all time)

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
        // Default to finding open payables across ALL time? 
        // Typically Payables is a Balance Sheet item, so at a specific date.
        // But the Tile says "Unpaid Invoices" implied current state.
        // But for GL based payables, we sum all history? 
        // Actually, usually you request Balance as of Date.
        // Let's assume "Current Balance" (all time). 
        // Or if we filter by year, it's just movement. Závazky is a specific point in time (Balance Sheet).
        // Let's fetch ALL entries for these accounts to get current balance.

        const accountsOfInterest = ['321', '379', '365', '343'];
        // Note: 343 needs special handling (net balance). 
        // But if we just sum (Credits - Debits), we get the net Liability (if positive).

        // We will fetch aggregated sums by account prefix
        // Since we can't do complex group by easily with Supabase client on large datasets without RPC,
        // we might just fetch all rows for these accounts?
        // Optimization: Create an RPC or just fetch. With 460 rows total journal (small DB), fetching is fine.

        const { data: entries, error } = await supabaseAdmin
            .from('accounting_journal')
            .select('account_md, account_d, amount')
            // Filter where either MD or D starts with our prefixes
            .or(`account_md.like.321%,account_d.like.321%,account_md.like.379%,account_d.like.379%,account_md.like.365%,account_d.like.365%,account_md.like.343%,account_d.like.343%`);

        if (error) throw error;

        let balance321 = 0;
        let balance379 = 0;
        let balance365 = 0;
        let balance343 = 0;

        entries?.forEach(entry => {
            const amount = Number(entry.amount);

            // Helper to check and add
            const process = (acc: string, side: 'md' | 'd') => {
                if (!acc) return;

                // Liabilities (Passive): Credit (D) increases, Debit (MD) decreases.
                const val = side === 'd' ? amount : -amount;

                if (acc.startsWith('321')) balance321 += val;
                else if (acc.startsWith('379')) balance379 += val;
                else if (acc.startsWith('365')) balance365 += val;
                else if (acc.startsWith('343')) balance343 += val;
            };

            process(entry.account_md, 'md');
            process(entry.account_d, 'd');
        });

        // 343: Only include if it's a Liability (Positive Credit Balance)
        // If 343 is negative (Debit balance), it is a Receivable (Pohledávka), so represented as 0 in Payables?
        // Or should strictly follow user request "include 343".
        // Usually, if the resulting balance of VAT is payable, it goes to Payables.
        const payableTax = balance343 > 0 ? balance343 : 0;

        const totalPayables = balance321 + balance379 + balance365 + payableTax;

        // Count? Hard to get "count of invoices" from GL without grouping by Doc Number.
        // We can just return null count or 0, or estimate?
        // The previous tile showed "count". 
        // GL based payables don't easily map to "count of invoices" unless we track open items.
        // We will omit count or set to null/hidden on UI if GL based.
        // Or we can keep the old 'accounting_documents' query in parallel for the count of 321? 
        // User said: "Modul Závazky musí ukazovat ... i Ostatní". 
        // It's acceptable to just show the financial volume.

        return NextResponse.json({
            totalPayables,
            breakdown: {
                '321': balance321,
                '379': balance379,
                '365': balance365,
                '343': payableTax
            }
        });

    } catch (e: unknown) {
        console.error('Error calculating Payables:', e);
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
