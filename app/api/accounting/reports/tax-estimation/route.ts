
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();

    try {
        const { searchParams } = new URL(req.url);
        const yearParam = searchParams.get('year') || new Date().getFullYear().toString();
        const year = Number(yearParam);

        // DPPO Rate (21% for 2024+)
        const TAX_RATE = 0.21;

        // Fetch ALL 343 entries for current year AND next year (to catch Jan payments)
        const { data: allVatEntries, error: errVat } = await supabaseAdmin
            .from('accounting_journal')
            .select('amount, text, account_md, account_d, date, fiscal_year')
            .in('fiscal_year', [year, year + 1])
            .or('account_md.ilike.343%,account_d.ilike.343%');

        if (errVat) throw errVat;

        let inputVat = 0;
        let outputVat = 0;
        let paidVat = 0; // Payments sent to state

        allVatEntries?.forEach(item => {
            const isMd343 = item.account_md?.startsWith('343');
            const isD343 = item.account_d?.startsWith('343');

            // Determine if this is a Payment/Refund (Financial Account Class 2)
            const isPaymentToState = isMd343 && item.account_d?.startsWith('2');
            const isRefundFromState = isD343 && item.account_md?.startsWith('2');
            const isFinancial = isPaymentToState || isRefundFromState;

            if (isFinancial) {
                // 2. Financial Operations (Payments) - Smart Rule
                // - Payment in Jan of Year X belongs to Year X-1
                // - Payment in Feb-Dec of Year X belongs to Year X

                // CRITICAL FIX: Do NOT apply consolidation text filtering here.
                // "Úhrada DPH" is a valid payment text!

                const date = new Date(item.date);
                const month = date.getMonth(); // 0 = Jan, 1 = Feb...

                if (item.fiscal_year === year) {
                    // Current Year Payment: Include ONLY if NOT January
                    if (month !== 0) {
                        if (isPaymentToState) paidVat += Number(item.amount);
                        if (isRefundFromState) paidVat -= Number(item.amount);
                    }
                } else if (item.fiscal_year === year + 1) {
                    // Next Year Payment: Include ONLY if January
                    if (month === 0) {
                        if (isPaymentToState) paidVat += Number(item.amount);
                        if (isRefundFromState) paidVat -= Number(item.amount);
                    }
                }
                return; // Done with financial
            }

            // --- Non-Financial (Business Operations) ---

            // Filter out consolidation entries based on Account 343111 (Settlement)
            // or Text patterns that indicate internal transfers/summaries
            const isConsolidationAccount = item.account_md === '343111' || item.account_d === '343111';

            let isConsolidationText = false;
            if (item.text) {
                const lowerText = item.text.toLowerCase();
                // Precise checks for the known summary texts to avoid false positives
                if (lowerText.includes('výstup ') || lowerText.includes('vstup ') || lowerText.startsWith('dp ') || lowerText === 'dp' || lowerText.includes('zaokrouhlení') || lowerText.includes('úhrada dph')) {
                    isConsolidationText = true;
                }
            }

            if (isConsolidationAccount || isConsolidationText) return;

            // 1. Business Operations (Invoices) MUST belong to the current fiscal year
            if (item.fiscal_year !== year) return;

            if (isMd343) inputVat += Number(item.amount);
            if (isD343) outputVat += Number(item.amount);
        });

        const netVat = outputVat - inputVat; // Positive = Pay to state


        // 2. DPPO Calculation
        const { data: glEntries } = await supabaseAdmin.from('accounting_journal')
            .select('account_md, account_d, amount')
            .eq('fiscal_year', year)
            .or('account_md.like.5%,account_md.like.6%,account_d.like.5%,account_d.like.6%');

        let revenues = 0;
        let expenses = 0;
        let nonDeductible = 0;

        const balances: Record<string, { md: number, d: number }> = {};
        const add = (acc: string, val: number, side: 'md' | 'd') => {
            if (!acc) return;
            if (!balances[acc]) balances[acc] = { md: 0, d: 0 };
            balances[acc][side] += val;
        };

        glEntries?.forEach(e => {
            const val = Number(e.amount);
            if (e.account_md) add(e.account_md, val, 'md');
            if (e.account_d) add(e.account_d, val, 'd');
        });

        Object.keys(balances).forEach(acc => {
            const b = balances[acc];
            const net = b.md - b.d;

            if (acc.startsWith('6')) {
                revenues += (-net);
            } else if (acc.startsWith('5')) {
                expenses += net;
                if (acc.startsWith('513') || acc.startsWith('543')) {
                    nonDeductible += net;
                }
            }
        });

        const accountingProfit = revenues - expenses;
        const taxBase = Math.max(0, accountingProfit + nonDeductible);
        const estimatedTax = taxBase * TAX_RATE;

        // 3. Paid Advances (DPPO) - Account 341
        const { data: dppoAdvances } = await supabaseAdmin
            .from('accounting_journal')
            .select('amount, account_md, account_d')
            .eq('fiscal_year', year)
            .ilike('account_md', '341%');

        const paidAdvances = dppoAdvances?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;


        return NextResponse.json({
            year,
            vat: {
                input: inputVat,   // Deductions
                output: outputVat, // Liability
                net: netVat,       // Liability generated
                paid: paidVat,      // Already paid
                remaining: netVat - paidVat // Remaining to pay
            },
            dppo: {
                revenues,
                expenses,
                accountingProfit,
                nonDeductible,
                taxBase,
                rate: TAX_RATE,
                estimatedTax,
                paid: paidAdvances,
                remaining: estimatedTax - paidAdvances
            }
        });

    } catch (e: any) {
        console.error('Error in tax estimation:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
