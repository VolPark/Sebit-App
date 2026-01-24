import { supabase } from '@/lib/supabase';
import { FixedCost, Division } from '@/lib/types/finance-types';
import { CompanyConfig } from '@/lib/companyConfig';

export const FixedCostService = {
    /**
     * Fetch Fixed Costs for a specific month (Manual + Accounting).
     */
    async fetchMonthlyCosts(year: number, month: number): Promise<{
        costs: FixedCost[],
        divisions: Division[]
    }> {
        // 1. Manual Costs
        const { data: fixedData, error } = await supabase
            .from('fixed_costs')
            .select('*, divisions(id, nazev)')
            .eq('rok', year)
            .eq('mesic', month)
            .order('nazev');

        if (error) throw error;

        // 2. Divisions
        const { data: divData } = await supabase.from('divisions').select('id, nazev').order('id');
        const divisions = (divData || []) as Division[];

        // 3. Accounting Imports
        let mappedData: FixedCost[] = [];
        if (CompanyConfig.features.enableAccounting) {
            const dateStart = `${year}-${String(month).padStart(2, '0')}-01`;
            const endD = new Date(year, month, 0);
            const dateEnd = `${year}-${String(month).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;

            const { data: accData } = await supabase
                .from('accounting_documents')
                .select('id, description, supplier_name, issue_date, currency, amount, amount_czk, mappings:accounting_mappings(id, amount, amount_czk, cost_category, note, division_id)')
                .gte('issue_date', dateStart)
                .lte('issue_date', dateEnd);

            if (accData) {
                accData.forEach((doc: any) => {
                    if (doc.mappings) {
                        doc.mappings.forEach((m: any) => {
                            if (m.cost_category === 'overhead') {
                                // Resolve division
                                const divName = m.division_id && divisions ? divisions.find(d => d.id === m.division_id)?.nazev : null;

                                let castka = Number(m.amount_czk);
                                if (!castka) {
                                    const RATES: Record<string, number> = { 'EUR': 25, 'USD': 23 };
                                    castka = Number(m.amount) * (RATES[doc.currency] || 1);
                                }

                                mappedData.push({
                                    id: -m.id, // Negative ID to distinguish from real DB ids in UI keys if needed? or just string
                                    rok: year,
                                    mesic: month,
                                    nazev: m.note || doc.description || doc.supplier_name || 'Neznámý náklad',
                                    castka: castka,
                                    division_id: m.division_id,
                                    divisions: divName ? { id: m.division_id, nazev: divName } : undefined,
                                    source: 'accounting',
                                    doc_id: doc.id
                                });

                                // Trigger sync if needed (fire & forget)
                                if ((!m.amount_czk || m.amount_czk === 0) && doc.currency !== 'CZK') {
                                    fetch('/api/accounting/sync-currency', { method: 'POST', body: JSON.stringify({ docId: doc.id }) }).catch(() => { });
                                }
                            }
                        });
                    }
                });
            }
        }

        const manualCosts = (fixedData || []).map((c: any) => ({ ...c, source: 'manual' }));
        const combined = [...manualCosts, ...mappedData].sort((a, b) => a.nazev.localeCompare(b.nazev));

        return {
            costs: combined,
            divisions
        };
    },

    /**
     * Copy costs from previous month.
     */
    async importFromPreviousMonth(targetYear: number, targetMonth: number): Promise<number> {
        let prevYear = targetYear;
        let prevMonth = targetMonth - 1;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
        }

        const { data: prevData } = await supabase.from('fixed_costs').select('*').eq('rok', prevYear).eq('mesic', prevMonth);

        if (!prevData || prevData.length === 0) return 0;

        const newRows = prevData.map(c => ({
            nazev: c.nazev,
            castka: c.castka,
            rok: targetYear,
            mesic: targetMonth,
            division_id: c.division_id // Inherit division? Yes.
        }));

        const { error } = await supabase.from('fixed_costs').insert(newRows);
        if (error) throw error;

        return newRows.length;
    },

    async createCost(cost: Partial<FixedCost>): Promise<void> {
        const { id, divisions, source, doc_id, ...payload } = cost as any;
        const { error } = await supabase.from('fixed_costs').insert(payload);
        if (error) throw error;
    },

    async updateCost(id: number, cost: Partial<FixedCost>): Promise<void> {
        const { id: _id, divisions, source, doc_id, ...payload } = cost as any;
        const { error } = await supabase.from('fixed_costs').update(payload).eq('id', id);
        if (error) throw error;
    },

    async deleteCost(id: number): Promise<void> {
        const { error } = await supabase.from('fixed_costs').delete().eq('id', id);
        if (error) throw error;
    }
};
