import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year') || new Date().getFullYear().toString();
        const year = Number(yearParam);

        // Fetch Provider Config for Custom Names
        const { data: provider } = await supabaseAdmin
            .from('accounting_providers')
            .select('config')
            .eq('code', 'uol')
            .single();

        const config = (provider?.config as any) || {};
        const customNames = config.custom_account_names || {};

        // Fetch Accounts for naming
        const { data: accountsData } = await supabaseAdmin
            .from('accounting_accounts')
            .select('code, name');

        const accountNames: Record<string, string> = {};
        accountsData?.forEach(acc => {
            accountNames[acc.code] = acc.name;
        });

        // Fetch Journal Entries for the year
        const { data: entries, error } = await supabaseAdmin
            .from('accounting_journal')
            .select('*')
            .eq('fiscal_year', year);

        if (error) throw error;

        // Aggregation Containers
        let totalRevenue = 0;   // Class 6
        let totalMaterial = 0;  // Group 50
        let totalServices = 0;  // Group 51
        let totalPersonnel = 0; // Group 52
        let totalOtherCosts = 0;// Rest of Class 5

        const accountsBreakdown: Record<string, { name: string; amount: number; items: any[] }> = {};

        // Standard Group Names
        const GROUP_NAMES: Record<string, string> = {
            '50': 'Spotřebované nákupy',
            '51': 'Služby',
            '52': 'Osobní náklady',
            '53': 'Daně a poplatky',
            '54': 'Jiné provozní náklady',
            '55': 'Odpisy, rezervy a opravné položky',
            '56': 'Finanční náklady',
            '57': 'Rezervy a opravné položky finanční',
            '58': 'Změna stavu zásob a aktivace',
            '59': 'Daně z příjmů'
        };

        const costStructure: Record<string, number> = {};

        function processEntry(account: string, amount: number, side: 'md' | 'd', text: string) {
            const firstChar = account.charAt(0);
            const firstTwo = account.substring(0, 2);

            if (firstChar === '5') {
                const sign = side === 'md' ? 1 : -1;
                const val = amount * sign;

                // Aggregate by Group
                costStructure[firstTwo] = (costStructure[firstTwo] || 0) + val;

                if (firstTwo === '50') totalMaterial += val;
                else if (firstTwo === '51') {
                    totalServices += val;
                }
                else if (firstTwo === '52') totalPersonnel += val;
                else totalOtherCosts += val;

                // Collect Breakdown for ALL Class 5 accounts
                // Priority: 1. Custom Name, 2. Specific Account Name, 3. Synthetic Account Name, 4. Code
                const name = customNames[account]
                    || accountNames[account]
                    || accountNames[account.substring(0, 3)]
                    || account;

                if (!accountsBreakdown[account]) {
                    accountsBreakdown[account] = {
                        name: name,
                        amount: 0,
                        items: []
                    };
                }
                accountsBreakdown[account].amount += val;
            }
            else if (firstChar === '6') {
                const sign = side === 'd' ? 1 : -1;
                const val = amount * sign;
                totalRevenue += val;
            }
        }

        entries?.forEach(entry => {
            // Processing Debit Side (MD)
            if (entry.account_md) {
                processEntry(entry.account_md, Number(entry.amount), 'md', entry.text);
            }
            // Processing Credit Side (D)
            if (entry.account_d) {
                processEntry(entry.account_d, Number(entry.amount), 'd', entry.text);
            }
        });

        // Refine Breakdown
        const breakdownArray = Object.values(accountsBreakdown)
            .map(s => ({
                name: s.name,
                amount: s.amount,
                code: Object.keys(accountsBreakdown).find(key => accountsBreakdown[key] === s)! // ! assertion safe here
            }))
            .sort((a, b) => b.amount - a.amount);

        // Prepare Cost Structure Array
        const costStructureArray = Object.keys(costStructure)
            .map(code => ({
                code,
                name: `${GROUP_NAMES[code] || 'Ostatní'}`,  // Removed code from name for cleaner UI
                amount: costStructure[code]
            }))
            .filter(item => Math.abs(item.amount) > 1) // Only show non-zero (tolerance 1)
            .sort((a, b) => b.amount - a.amount);

        // Calculate Metrics
        const valueAdded = totalRevenue - (totalMaterial + totalServices);
        const operatingResult = totalRevenue - (totalMaterial + totalServices + totalPersonnel + totalOtherCosts);

        return NextResponse.json({
            year,
            metrics: {
                totalRevenue,
                totalMaterial,   // Výkonová spotřeba - Materiál
                totalServices,   // Výkonová spotřeba - Služby
                totalPersonnel,
                totalOtherCosts,
                valueAdded,      // Přidaná hodnota
                operatingResult  // Provozní výsledek hospodaření
            },
            breakdown: breakdownArray,
            costStructure: costStructureArray
        });

    } catch (e: any) {
        console.error('Error calculating Value Added Report:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
