
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
                .select('amount, text')
                .eq('fiscal_year', year)
                .ilike(side, '343%');

            // Exclude some patterns if needed, but risky. 
            // Better: Exclude offset accounts if they are not tax-relevant?
            // For estimation, raw sum is usually okay if we assume 343 matches tax return.
            return q;
        };

        const { data: vatInput, error: errInput } = await buildVatQuery('account_md');
        const { data: vatOutput, error: errOutput } = await buildVatQuery('account_d');

        if (errInput || errOutput) throw new Error('Failed to fetch VAT data');

        const inputVat = vatInput?.reduce((sum, item) => sum + item.amount, 0) || 0;
        const outputVat = vatOutput?.reduce((sum, item) => sum + item.amount, 0) || 0;
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
            if (e.account_md) add(e.account_md, e.amount, 'md');
            if (e.account_d) add(e.account_d, e.amount, 'd');
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

        // 3. Paid Advances (DPPO)
        // Typically account 341 (Tax prepayments)
        /*
        const { data: advancesData } = await supabaseAdmin.from('accounting_journal')
            .select('amount')
            .eq('fiscal_year', year)
            .ilike('account_md', '341%');
        const paidAdvances = advancesData?.reduce((sum, item) => sum + item.amount, 0) || 0;
        */

        return NextResponse.json({
            year,
            vat: {
                input: inputVat,   // Deductions
                output: outputVat, // Liability
                net: netVat,       // To Pay
            },
            dppo: {
                revenues,
                expenses,
                accountingProfit,
                nonDeductible,
                taxBase,
                rate: TAX_RATE,
                estimatedTax
            }
        });

    } catch (e: any) {
        console.error('Error in tax estimation:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
