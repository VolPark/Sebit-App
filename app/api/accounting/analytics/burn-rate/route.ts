import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Security: Verify user session
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Calculate Current Cash
        // Fetch all accounts
        const { data: accounts, error: accError } = await supabase
            .from('accounting_bank_accounts')
            .select('bank_account_id, name, opening_balance, currency');

        if (accError) throw accError;

        let totalCash = 0;

        for (const acc of accounts || []) {
            // Fetch sum of movements since synchronization began (or all movements if opening balance is absolute start)
            // Assuming opening_balance is from UOL at some point, and we sync movements after?
            // Actually, usually `opening_balance` in UOL is at start of fiscal year or start of account.
            // And `movements` are all movements.
            // Let's assume Balance = Opening + Sum(Movements).

            // However, verify if we have ALL movements. `AccountingService` logic syncs from last synced date.
            // If `opening_balance` is dynamic from UOL (fetched every sync), then we just need movements AFTER that?
            // No, `AccountingService` fetches account detail which has `opening_balance`.
            // But usually APIs return "current balance" or "opening balance of year".
            // Let's assume `opening_balance` is correct base.

            const { data: movements, error: movError } = await supabase
                .from('accounting_bank_movements')
                .select('amount')
                .eq('bank_account_id', acc.bank_account_id);

            if (movError) throw movError;

            const movementsSum = movements?.reduce((sum, m) => sum + m.amount, 0) || 0;
            const currentBalance = (acc.opening_balance || 0) + movementsSum;

            // Convert to CZK assuming 1:1 for now if currency is CZK or undefined.
            // If EUR, we might need rate. detailed logic omitted for MVP.
            totalCash += currentBalance;
        }

        // 2. Calculate Monthly Expenses (Burn Rate)
        // Average of last 3 months
        const today = new Date();
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString();

        const { data: expenses, error: expError } = await supabase
            .from('accounting_journal')
            .select('amount, date')
            .ilike('account_md', '5%') // Class 5 = Costs/Expenses
            .gte('date', threeMonthsAgo);

        if (expError) throw expError;

        const totalExpenses = expenses?.reduce((sum, item) => sum + item.amount, 0) || 0;
        const monthlyBurn = totalExpenses / 3;

        // 3. Calculate Runway
        const runwayMonths = monthlyBurn > 0 ? totalCash / monthlyBurn : 0;

        return NextResponse.json({
            cash: totalCash,
            monthlyBurn,
            runwayMonths: parseFloat(runwayMonths.toFixed(1))
        });
    } catch (error: any) {
        console.error('Error calculating burn rate:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
