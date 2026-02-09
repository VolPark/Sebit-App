import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';
import { parseYearParam } from '@/lib/api/schemas';

import { getErrorMessage } from '@/lib/errors';
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Security: Verify user session
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();

    try {
        const { searchParams } = new URL(req.url);
        const yearResult = parseYearParam(searchParams);
        if (yearResult instanceof NextResponse) return yearResult;
        const { year } = yearResult;
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        // Parallel Fetching
        // We split the range fetch into two efficient single-row queries
        const [journalRes, docsRes, minDateRes, maxDateRes] = await Promise.all([
            // 1. Fetch Journal for Financials
            supabaseAdmin
                .from('accounting_journal')
                .select('date, account_md, account_d, amount')
                .gte('date', startDate)
                .lte('date', endDate),

            // 2. Fetch Docs for Top Customers
            supabaseAdmin
                .from('accounting_documents')
                .select('supplier_name, amount, amount_czk')
                .eq('type', 'sales_invoice')
                .gte('issue_date', startDate) // Approx match
                .lte('issue_date', endDate)
                .neq('status', 'cancelled'),

            // 3. Min Date
            supabaseAdmin
                .from('accounting_journal')
                .select('date')
                .order('date', { ascending: true })
                .limit(1)
                .maybeSingle(),

            // 4. Max Date
            supabaseAdmin
                .from('accounting_journal')
                .select('date')
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle()
        ]);

        if (journalRes.error) throw new Error('Journal Error: ' + journalRes.error);
        if (docsRes.error) throw new Error('Docs Error: ' + docsRes.error);

        // Log errors for range but usually non-fatal
        if (minDateRes.error) console.error('MinDate Error:', minDateRes.error);
        if (maxDateRes.error) console.error('MaxDate Error:', maxDateRes.error);

        const journal = journalRes.data || [];
        const docs = docsRes.data || [];

        // --- CALCULATE AVAILABLE YEARS ---
        let availableYears: number[] = [];

        if (minDateRes.data?.date && maxDateRes.data?.date) {
            const minYear = new Date(minDateRes.data.date).getFullYear();
            const maxYear = new Date(maxDateRes.data.date).getFullYear();

            // Generate full range
            for (let y = minYear; y <= maxYear; y++) {
                availableYears.push(y);
            }
        }

        // Ensure current year or requested year is always present if range is empty
        if (availableYears.length === 0) {
            availableYears = [new Date().getFullYear()];
        }

        // Ensure requested year is in list
        if (!availableYears.includes(year)) {
            availableYears.push(year);
            availableYears.sort((a, b) => a - b);
        }

        // Remove duplicates just in case
        availableYears = [...new Set(availableYears)];


        // --- PROCESSING CASH FLOW & PROFIT ---
        const months = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            cashIn: 0,
            cashOut: 0,
            revenue: 0,
            expenses: 0,
            profit: 0
        }));

        const expenseCategories: Record<string, number> = {};

        journal.forEach(entry => {
            const date = new Date(entry.date);
            const monthIdx = date.getMonth(); // 0-11
            const amount = Number(entry.amount) || 0;

            const md = entry.account_md || '';
            const d = entry.account_d || '';

            // 1. Cash Flow (Class 2, excluding internal transfers)
            // Definition: Movement between Cash Account (2xx except 26x) and Non-Cash Account (Not 2xx).
            // If both sides are 2xx (e.g. 221 vs 261, or 221 vs 211), it is internal transfer.

            const isCashMD = md.startsWith('2') && !md.startsWith('26');
            const isCashD = d.startsWith('2') && !d.startsWith('26');

            if (isCashMD && !d.startsWith('2')) {
                // Asset Increase (Debit) from Non-Cash Source (Credit) -> Cash In
                months[monthIdx].cashIn += amount;
            } else if (isCashD && !md.startsWith('2')) {
                // Asset Decrease (Credit) to Non-Cash Target (Debit) -> Cash Out
                months[monthIdx].cashOut += amount;
            }

            // 2. Profit Calculation (Netting)
            // Revenues (Class 6): Credit (+), Debit (-)
            // Expenses (Class 5): Debit (+), Credit (-)

            // Check MD side
            if (md.startsWith('5')) {
                // MD Class 5 = Expense Increase
                months[monthIdx].expenses += amount;

                // Track breakdown
                const group = md.substring(0, 2);
                expenseCategories[group] = (expenseCategories[group] || 0) + amount;
            } else if (md.startsWith('6')) {
                // MD Class 6 = Revenue Decrease (e.g. Credit Note)
                months[monthIdx].revenue -= amount;
            }

            // Check D side
            if (d.startsWith('6')) {
                // D Class 6 = Revenue Increase
                months[monthIdx].revenue += amount;
            } else if (d.startsWith('5')) {
                // D Class 5 = Expense Decrease (e.g. Vendor Refund)
                months[monthIdx].expenses -= amount;

                // Adjust breakdown
                const group = d.substring(0, 2);
                expenseCategories[group] = (expenseCategories[group] || 0) - amount;
            }
        });

        // Calculate Profit Per Month
        months.forEach(m => {
            m.profit = m.revenue - m.expenses;
        });

        // --- PROCESSING TOP CUSTOMERS ---
        const customerMap: Record<string, number> = {};
        docs.forEach(doc => {
            const name = doc.supplier_name || 'Neznámý';
            const val = Number(doc.amount_czk || doc.amount || 0);
            customerMap[name] = (customerMap[name] || 0) + val;
        });

        const topCustomers = Object.entries(customerMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // --- PROCESSING EXPENSE CATEGORIES ---
        const expenseStructure = Object.entries(expenseCategories)
            .map(([group, value]) => {
                const names: Record<string, string> = {
                    '50': 'Spotřebované nákupy',
                    '51': 'Služby',
                    '52': 'Osobní náklady',
                    '53': 'Daně a poplatky',
                    '54': 'Jiné provozní náklady',
                    '55': 'Odpisy',
                    '56': 'Finanční náklady',
                    '57': 'Rezervy',
                    '58': 'Změna stavu zásob',
                    '59': 'Daně z příjmů'
                };
                return { group, name: names[group] || `Skupina ${group}`, value };
            })
            .sort((a, b) => b.value - a.value);

        return NextResponse.json({
            year,
            availableYears,
            monthly: months,
            topCustomers,
            expenseStructure
        });

    } catch (e: unknown) {
        console.error('Analytics error:', e);
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
