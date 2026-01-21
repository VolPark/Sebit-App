
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year') || new Date().getFullYear().toString();
        const year = Number(yearParam);

        // DPPO Rate (21% for 2024+)
        const TAX_RATE = 0.21;

        // 1. VAT Calculation (Full Year)
        // Output VAT (Liability) - Credit side of 343
        // Input VAT (Deduction) - Debit side of 343

        // Exclude closing operations usually marked with specific text or account 7xx/395 if applicable
        // Simple filter based on text exclusions used in other reports
        const excludedTexts = ['%DP%', '%Úhrada DPH%', '%výstup%', '%vstup%', '%zaokrouhlení%', '%haléřové vyrovnání%'];

        const buildVatQuery = (side: 'account_md' | 'account_d') => {
            let q = supabaseAdmin.from('accounting_journal')
                .select('amount, text, account_md, account_d')
                .eq('fiscal_year', year)
                .ilike(side, '343%');

            // Exclude some patterns if needed, but risky. 
            // Better: Exclude offset accounts if they are not tax-relevant?
            // For estimation, raw sum is usually okay if we assume 343 matches tax return.
            return q;
        };

        // 2b. Calculate Already Paid VAT (Payments to State)
        // This is what we excluded above: Debit 343 with Credit 2xx
        // Also refunds: Credit 343 with Debit 2xx

        let vatPaidToState = 0;
        let vatRefundedFromState = 0;

        // Iterate raw input/output again or do a separate query?
        // Let's do separate query for clarity or just filter the raw data if we fetched enough? 
        // We need to fetch ALL 343 entries to splits them correctly.
        // Actually, let's just re-fetch everything on 343 and splitting it into "Business" vs "Payment".

        // Let's refactor step 1 for efficiency.
        // Let's refactor step 1 for efficiency.
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

            // Determine if this is a Payment/Refund
            const isPaymentToState = isMd343 && item.account_d?.startsWith('2');
            const isRefundFromState = isD343 && item.account_md?.startsWith('2');
            const isFinancial = isPaymentToState || isRefundFromState;

            // DATE LOGIC:
            // 1. Business Operations (Invoices) MUST belong to the current fiscal year
            if (!isFinancial) {
                if (item.fiscal_year !== year) return; // Skip next year's invoices

                if (isMd343) inputVat += Number(item.amount);
                if (isD343) outputVat += Number(item.amount);
                return;
            }

            // 2. Financial Operations (Payments) - Smart Rule
            // - Payment in Jan of Year X belongs to Year X-1
            // - Payment in Feb-Dec of Year X belongs to Year X

            const date = new Date(item.date);
            const month = date.getMonth(); // 0 = Jan, 1 = Feb...

            // We are calculating for `year`.
            // We want payments made in: [Feb `year` ... Jan `year + 1`]

            if (item.fiscal_year === year) {
                // Current Year Payment
                // Include ONLY if NOT January (because Jan belongs to prev year)
                if (month !== 0) {
                    if (isPaymentToState) paidVat += Number(item.amount);
                    if (isRefundFromState) paidVat -= Number(item.amount);
                }
            } else if (item.fiscal_year === year + 1) {
                // Next Year Payment
                // Include ONLY if January (because Jan belongs to `year`)
                if (month === 0) {
                    if (isPaymentToState) paidVat += Number(item.amount);
                    if (isRefundFromState) paidVat -= Number(item.amount);
                }
            }
        });

        const netVat = outputVat - inputVat; // Positive = Pay to state


        // 2. DPPO Calculation
        // 2. DPPO Calculation (Using Net Logic like Profit & Loss)
        // Fetch ALL entries for Class 5 and 6
        const { data: glEntries } = await supabaseAdmin.from('accounting_journal')
            .select('account_md, account_d, amount')
            .eq('fiscal_year', year)
            .or('account_md.like.5%,account_md.like.6%,account_d.like.5%,account_d.like.6%');

        // Calculate Net Balances
        // 5xx: Cost = MD - D
        // 6xx: Revenue = D - MD

        let revenues = 0;
        let expenses = 0;
        let nonDeductible = 0;

        // Helper Map
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
            const net = b.md - b.d; // Standard Balance (Debit - Credit)

            if (acc.startsWith('6')) {
                // Revenue: We expect Credit balance, so Net should be negative. 
                // We add (-Net) to Revenues.
                // e.g. D = 1000, MD = 0 -> Net = -1000 -> Rev += 1000.
                // e.g. D = 1000, MD = 200 (Correction) -> Net = -800 -> Rev += 800.
                revenues += (-net);
            } else if (acc.startsWith('5')) {
                // Cost: We expect Debit balance.
                // e.g. MD = 500 -> Net = 500 -> Exp += 500.
                expenses += net;

                // Non-deductible tracking (Net basis too)
                if (acc.startsWith('513') || acc.startsWith('543')) {
                    nonDeductible += net;
                }
            }
        });

        const accountingProfit = revenues - expenses;
        const taxBase = Math.max(0, accountingProfit + nonDeductible);
        const estimatedTax = taxBase * TAX_RATE;

        // 3. Paid Advances (DPPO) - Account 341
        // Fetch 341 account movement (Debit side usually means payment of advance)
        const { data: dppoAdvances } = await supabaseAdmin
            .from('accounting_journal')
            .select('amount, account_md, account_d')
            .eq('fiscal_year', year)
            .ilike('account_md', '341%'); // Debit 341 is claim against state (advance paid)

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
