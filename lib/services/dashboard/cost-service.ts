export interface CostData {
    totalCosts: number;
    totalMaterialCost: number;
    materialProfit: number;
    monthlyCosts: Map<string, number>;
    monthlyMaterialCost: Map<string, number>;
    monthlyFixedCostsGlobal: Map<string, number>;
    monthlyFixedCostsSpecific: Map<string, number>;
}

export const CostService = {
    calculateCosts(
        akceData: any[],
        fixedCostsData: any[],
        accountingDocs: any[],
        filters: { klientId?: number | null; divisionId?: number | null; pracovnikId?: number | null },
        helpers: { getMonthKey: (d: Date) => string }
    ): CostData {
        const result: CostData = {
            totalCosts: 0,
            totalMaterialCost: 0,
            materialProfit: 0,
            monthlyCosts: new Map(),
            monthlyMaterialCost: new Map(),
            monthlyFixedCostsGlobal: new Map(),
            monthlyFixedCostsSpecific: new Map()
        };

        const { getMonthKey } = helpers;
        const useFilterMode = !!(filters.klientId || filters.divisionId);

        // Helper to add to monthly costs
        const addToCosts = (key: string, amount: number) => {
            result.monthlyCosts.set(key, (result.monthlyCosts.get(key) || 0) + amount);
            result.totalCosts += amount;
        };

        // 1. Process Akce (Material Costs)
        for (const a of akceData) {
            const d = new Date(a.datum);
            const key = getMonthKey(d);

            // Explicit Project Material
            const matMy = a.material_my || 0;
            const matKlient = a.material_klient || 0;

            addToCosts(key, matMy);
            result.totalMaterialCost += matMy;
            result.monthlyMaterialCost.set(key, (result.monthlyMaterialCost.get(key) || 0) + matMy);

            // Profit from material = Client Price - My Cost
            // (Note: This accumulation of profit assumes RevenueService added matKlient separately? 
            // In original code, materialProfit is a separate bucket field, not part of Gross Profit directly 
            // until the end where Gross Profit = Rev - Cost.
            // Actually `bucket.materialProfit += ((a.material_klient || 0) - (a.material_my || 0));`
            // So we return `materialProfit` delta here.

            result.materialProfit += (matKlient - matMy);
        }

        // 2. Process Fixed Costs (Table)
        for (const fc of fixedCostsData) {
            const key = `${fc.rok}-${fc.mesic - 1}`; // Match format (0-indexed month)
            const amount = Number(fc.castka) || 0;

            if (fc.division_id) {
                result.monthlyFixedCostsSpecific.set(key, (result.monthlyFixedCostsSpecific.get(key) || 0) + amount);
            } else {
                result.monthlyFixedCostsGlobal.set(key, (result.monthlyFixedCostsGlobal.get(key) || 0) + amount);
            }

            // In Simple Mode (Global), we add this to totalCosts immediately (as a bucket sum)
            // In Filter Mode, it is distributed via Rate, so we do NOT add it here.
            if (!useFilterMode) {
                // Determine bucket key from Y/M
                const d = new Date(fc.rok, fc.mesic - 1, 1);
                const bucketKey = getMonthKey(d);
                addToCosts(bucketKey, amount);
            }
        }

        // 3. Process Purchase Invoices (Accounting)
        for (const doc of accountingDocs) {
            if (doc.type !== 'purchase_invoice') continue;

            const d = new Date(doc.tax_date || doc.issue_date);
            const key = getMonthKey(d);
            const fixedCostKey = `${d.getFullYear()}-${d.getMonth()}`;

            if (doc.mappings && doc.mappings.length > 0) {
                for (const m of doc.mappings) {
                    // Logic for filtering
                    const linkedAkce = m.akce_id ? akceData.find((a: any) => a.id === m.akce_id) : null;
                    let matchesFilter = true;

                    if (filters.klientId) {
                        if (!linkedAkce || linkedAkce.klient_id !== filters.klientId) matchesFilter = false;
                    }
                    if (filters.divisionId) {
                        const directMatch = m.division_id === filters.divisionId;
                        const actionMatch = linkedAkce && linkedAkce.division_id === filters.divisionId;
                        if (!directMatch && !actionMatch) matchesFilter = false;
                    }
                    if (filters.pracovnikId) {
                        if (m.pracovnik_id !== filters.pracovnikId) matchesFilter = false;
                    }

                    if (matchesFilter) {
                        // SKIP LABOR (handled in LaborService)
                        if (m.pracovnik_id) continue;

                        let val = Number(m.amount_czk);
                        if (!val) val = Number(m.amount) * (doc.currency === 'EUR' ? 25 : doc.currency === 'USD' ? 23 : 1);

                        if (m.cost_category === 'overhead') {
                            if (!m.akce_id) {
                                // Add to Fixed Costs Maps for Rate Calculation
                                if (m.division_id) {
                                    result.monthlyFixedCostsSpecific.set(fixedCostKey, (result.monthlyFixedCostsSpecific.get(fixedCostKey) || 0) + val);
                                } else {
                                    result.monthlyFixedCostsGlobal.set(fixedCostKey, (result.monthlyFixedCostsGlobal.get(fixedCostKey) || 0) + val);
                                }

                                // Add to Total Costs?
                                if (!useFilterMode) {
                                    addToCosts(key, val);
                                } else {
                                    // Do not add to direct costs, distributed via rate
                                }
                            } else {
                                // Project-linked overhead is a direct cost
                                addToCosts(key, val);
                            }
                        } else {
                            // Regular cost (Material or other)
                            addToCosts(key, val);

                            if (m.cost_category === 'material') {
                                result.totalMaterialCost += val;
                                result.monthlyMaterialCost.set(key, (result.monthlyMaterialCost.get(key) || 0) + val);
                                // Reduce material profit
                                result.materialProfit -= val;
                            }
                        }
                    }
                }
            } else {
                // Unmapped
                if (!filters.klientId && !filters.divisionId && !filters.pracovnikId) {
                    let val = Number(doc.amount_czk);
                    if (!val) val = Number(doc.amount) * (doc.currency === 'EUR' ? 25 : doc.currency === 'USD' ? 23 : 1);
                    addToCosts(key, val);
                }
            }
        }

        return result;
    }
};
