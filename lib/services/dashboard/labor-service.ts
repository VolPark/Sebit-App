export interface LaborData {
    totalLaborCost: number;
    totalOverheadCost: number;
    totalHours: number;
    totalEstimatedHours: number;
    monthlyLaborCost: Map<string, number>;
    monthlyOverheadCost: Map<string, number>;
    monthlyHours: Map<string, number>;
    workerStats: Map<string, Map<number, { name: string; total: number }>>;

    // KPIs
    workerMonthRate: Map<string, number>;
    monthlyOverheadRate: Map<string, number>;
}

export const LaborService = {
    calculateLabor(
        praceData: any[], // Filtered traces
        allPraceData: any[], // Global traces for rate calc
        mzdyData: any[],
        workersData: any[],
        accountingDocs: any[], // For mapped labor
        costData: {
            monthlyFixedCostsGlobal: Map<string, number>;
            monthlyFixedCostsSpecific: Map<string, number>;
        },
        filters: { klientId?: number | null; divisionId?: number | null; pracovnikId?: number | null },
        helpers: { getMonthKey: (d: Date) => string }
    ): LaborData {
        const result: LaborData = {
            totalLaborCost: 0,
            totalOverheadCost: 0,
            totalHours: 0,
            totalEstimatedHours: 0,
            monthlyLaborCost: new Map(),
            monthlyOverheadCost: new Map(),
            monthlyHours: new Map(),
            workerStats: new Map(),
            workerMonthRate: new Map(),
            monthlyOverheadRate: new Map()
        };

        const { getMonthKey } = helpers;
        const useFilterMode = !!(filters.klientId || filters.divisionId);

        // --- 1. Calculate Rates ---

        // A. Worker Base Rates (Global)
        const workerBaseRateMap = new Map<number, number>();
        workersData.forEach((w: any) => workerBaseRateMap.set(w.id, Number(w.hodinova_mzda) || 0));

        // B. Worker Monthly Hours (Global)
        const workerMonthHours = new Map<string, number>();
        for (const p of allPraceData) {
            const d = new Date(p.datum);
            const key = `${p.pracovnik_id}-${d.getFullYear()}-${d.getMonth()}`;
            workerMonthHours.set(key, (workerMonthHours.get(key) || 0) + (p.pocet_hodin || 0));
        }

        // C. Worker Monthly Cost (Mzdy + Mapped)
        const workerMonthTotalCost = new Map<string, number>();

        // Mzdy
        for (const m of mzdyData) {
            const key = `${m.pracovnik_id}-${m.rok}-${m.mesic - 1}`;
            workerMonthTotalCost.set(key, (workerMonthTotalCost.get(key) || 0) + (Number(m.celkova_castka) || 0));
        }

        // Mapped Labor from Accounting
        if (accountingDocs.length > 0) {
            for (const doc of accountingDocs) {
                if (doc.mappings) {
                    const d = new Date(doc.tax_date || doc.issue_date);
                    const keySuffix = `${d.getFullYear()}-${d.getMonth()}`;
                    for (const m of doc.mappings) {
                        if (m.pracovnik_id) {
                            const key = `${m.pracovnik_id}-${keySuffix}`;
                            let val = Number(m.amount_czk);
                            if (!val) val = Number(m.amount) * (doc.currency === 'EUR' ? 25 : doc.currency === 'USD' ? 23 : 1);
                            workerMonthTotalCost.set(key, (workerMonthTotalCost.get(key) || 0) + val);
                        }
                    }
                }
            }
        }

        // D. Calculate Actual Worker Rate
        workerMonthTotalCost.forEach((totalCost, key) => {
            const hours = workerMonthHours.get(key) || 0;
            const parts = key.split('-');
            const pId = parseInt(parts[0]);

            if (hours > 0) {
                let rate = totalCost / hours;
                const baseRate = workerBaseRateMap.get(pId) || 0;
                if (baseRate > 0 && rate > (baseRate * 1.5)) {
                    rate = baseRate; // Cap at 1.5x base rate
                }
                result.workerMonthRate.set(key, rate);
            }
        });

        // E. Overhead Rates
        // Global Hours for Overhead Calc
        const monthlyGlobalHours = new Map<string, number>();
        allPraceData.forEach((p: any) => {
            const d = new Date(p.datum);
            const key = getMonthKey(d);
            monthlyGlobalHours.set(key, (monthlyGlobalHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
        });

        // Division Hours (if needed) - assumes filteredPraceData is Division-Filtered if divisionId is set
        const monthlyDivisionHours = new Map<string, number>();
        if (filters.divisionId) {
            praceData.forEach((p: any) => {
                const d = new Date(p.datum);
                const key = getMonthKey(d);
                monthlyDivisionHours.set(key, (monthlyDivisionHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
            });
        }

        // Calc Rate
        const allMonths = new Set([...costData.monthlyFixedCostsGlobal.keys(), ...monthlyGlobalHours.keys()]);
        allMonths.forEach(key => {
            let rate = 0;
            // Global Part
            const globalCost = costData.monthlyFixedCostsGlobal.get(key) || 0;
            const globalHours = monthlyGlobalHours.get(key) || 0;
            if (globalHours > 0) rate += (globalCost / globalHours);

            // Specific Part
            if (filters.divisionId) {
                const specificCost = costData.monthlyFixedCostsSpecific.get(key) || 0;
                const divHours = monthlyDivisionHours.get(key) || 0; // Using calculated map
                if (divHours > 0) rate += (specificCost / divHours);
            }
            result.monthlyOverheadRate.set(key, rate);
        });

        // --- 2. Calculate Costs ---

        const addToStats = (key: string, map: Map<string, number>, val: number) => {
            map.set(key, (map.get(key) || 0) + val);
        };

        if (!useFilterMode) {
            // Simple Mode: Aggregate Totals directly

            // Labor Cost
            workerMonthTotalCost.forEach((val, key) => {
                const parts = key.split('-');
                // date key logic
                const d = new Date(parseInt(parts[1]), parseInt(parts[2]), 1);
                const mKey = getMonthKey(d);

                addToStats(mKey, result.monthlyLaborCost, val);
                result.totalLaborCost += val;
            });

            // Hours & Worker Stats
            for (const p of praceData) {
                const d = new Date(p.datum);
                const key = getMonthKey(d);
                addToStats(key, result.monthlyHours, p.pocet_hodin || 0);
                result.totalHours += (p.pocet_hodin || 0);

                if (p.pracovnik_id && p.pracovnici) {
                    if (!result.workerStats.has(key)) result.workerStats.set(key, new Map());
                    const wMap = result.workerStats.get(key)!;
                    const wName = Array.isArray(p.pracovnici) ? p.pracovnici[0]?.jmeno : p.pracovnici?.jmeno;
                    const curr = wMap.get(p.pracovnik_id) || { name: wName || 'Neznámý', total: 0 };
                    curr.total += (p.pocet_hodin || 0);
                    wMap.set(p.pracovnik_id, curr);
                }
            }

            // Overhead Cost - already summed in CostService for Global Mode?
            // Yes, CostService adds it to 'totalCosts' bucket.
            // But LaborService is responsible for 'totalOverheadCost' stat?
            // In CostService, we didn't populate a 'totalOverheadCost' return field, only totalCosts/totalMaterial.
            // We should probably handle Overhead collection fully here IF we want consistency.
            // But we passed 'monthlyFixedCostsGlobal' from CostService.

            // Let's recalculate the 'sum' here for the stat field.
            costData.monthlyFixedCostsGlobal.forEach((val, key) => {
                // key is YYYY-M (0-indexed). getMonthKey expects Date or similar format.
                // Assume getMonthKey produces "YYYY-M".
                // Let's ensure format match.
                const parts = key.split('-');
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]), 1);
                const mKey = getMonthKey(d);
                addToStats(mKey, result.monthlyOverheadCost, val);
                result.totalOverheadCost += val;
            });

        } else {
            // Filter Mode: Iterate Prace and apply rates
            for (const p of praceData) {
                // Assume 'praceData' is already filtered by Caller (Client/Division)

                const d = new Date(p.datum);
                const key = getMonthKey(d);
                const rateKey = `${p.pracovnik_id}-${d.getFullYear()}-${d.getMonth()}`;

                const workerRate = result.workerMonthRate.get(rateKey) || 0;
                const overheadRate = result.monthlyOverheadRate.get(key) || 0;

                const hours = (p.pocet_hodin || 0);
                const laborVal = hours * workerRate;
                const overheadVal = hours * overheadRate;

                addToStats(key, result.monthlyLaborCost, laborVal);
                addToStats(key, result.monthlyOverheadCost, overheadVal);
                addToStats(key, result.monthlyHours, hours);

                result.totalLaborCost += laborVal;
                result.totalOverheadCost += overheadVal;
                result.totalHours += hours;

                // Worker Stats
                if (p.pracovnik_id && p.pracovnici) {
                    if (!result.workerStats.has(key)) result.workerStats.set(key, new Map());
                    const wMap = result.workerStats.get(key)!;
                    const wName = Array.isArray(p.pracovnici) ? p.pracovnici[0]?.jmeno : p.pracovnici?.jmeno;
                    const curr = wMap.get(p.pracovnik_id) || { name: wName || 'Neznámý', total: 0 };
                    curr.total += hours;
                    wMap.set(p.pracovnik_id, curr);
                }
            }
        }

        return result;
    }
};
