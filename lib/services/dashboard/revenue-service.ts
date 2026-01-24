export interface RevenueData {
    totalRevenue: number;
    monthlyRevenue: Map<string, number>;
    monthlyMaterialKlient: Map<string, number>;
    monthlyEstimatedHours: Map<string, number>;
    clientStats: Map<string, Map<number, { name: string; total: number }>>;
}

export const RevenueService = {
    /**
     * Calculates revenue from Projects (Akce), Finance records, and Sales Invoices.
     */
    calculateRevenue(
        akceData: any[],
        financeData: any[],
        accountingDocs: any[],
        filters: { klientId?: number | null; divisionId?: number | null; pracovnikId?: number | null },
        helpers: { getMonthKey: (d: Date) => string }
    ): RevenueData {
        const result: RevenueData = {
            totalRevenue: 0,
            monthlyRevenue: new Map(),
            monthlyMaterialKlient: new Map(),
            monthlyEstimatedHours: new Map(),
            clientStats: new Map(),
        };

        const { getMonthKey } = helpers;

        // Helper to add to stats
        const addToStats = (key: string, amount: number, client?: { id: number; name: string }) => {
            result.monthlyRevenue.set(key, (result.monthlyRevenue.get(key) || 0) + amount);
            result.totalRevenue += amount;

            if (client) {
                if (!result.clientStats.has(key)) result.clientStats.set(key, new Map());
                const cMap = result.clientStats.get(key)!;
                const currC = cMap.get(client.id) || { name: client.name || 'Neznámý', total: 0 };
                currC.total += amount;
                cMap.set(client.id, currC);
            }
        };

        // 1. Process Akce (Standard Projects = Fixed Price)
        for (const a of akceData) {
            const d = new Date(a.datum);
            const key = getMonthKey(d);

            // These metrics are tracked for all projects in Akce (usually), or just Standard? 
            // Original code: Line 283 tracked material_klient/estimated for ALL Akce found.
            // But Revenue is only for Standard.
            // Let's check original loop condition (Step 130).
            /* 
               const bucket = monthlyBuckets.get(key);
               if (bucket) {
                 if ((a.project_type || 'STANDARD') === 'STANDARD') {
                    bucket.totalRevenue += (a.cena_klient || 0);
                 }
                 bucket.totalMaterialKlient += (a.material_klient || 0);
                 // ...
                 bucket.totalEstimatedHours += (a.odhad_hodin || 0);
               } 
            */
            // So Material and Estimated Hours are tracked for ALL projects in Akce table, regardless of type.

            result.monthlyMaterialKlient.set(key, (result.monthlyMaterialKlient.get(key) || 0) + (a.material_klient || 0));
            result.monthlyEstimatedHours.set(key, (result.monthlyEstimatedHours.get(key) || 0) + (a.odhad_hodin || 0));

            if ((a.project_type || 'STANDARD') === 'STANDARD') {
                // Client filtering is handled by the caller (fetching data), or here if needed?
                // The passed data seems to be already filtered or we trust the logic.
                // In original code, filtering was mixed. Here we assume `akceData` is relevant 
                // BUT wait, `accountingDocs` need explicit filtering.

                const client = a.klient_id && a.klienti
                    ? { id: a.klient_id, name: Array.isArray(a.klienti) ? a.klienti[0]?.nazev : a.klienti?.nazev }
                    : undefined;

                addToStats(key, a.cena_klient || 0, client);
            }
        }

        // 2. Process Finance (Service/Time Material Revenue)
        for (const f of financeData) {
            const fAction = f.akce;
            if (!fAction) continue;
            // Skip Standard projects (already counted above)
            if ((fAction.project_type || 'STANDARD') === 'STANDARD') continue;

            const d = new Date(f.datum);
            const key = getMonthKey(d);
            const client = fAction.klient_id && fAction.klienti
                ? { id: fAction.klient_id, name: Array.isArray(fAction.klienti) ? fAction.klienti[0]?.nazev : fAction.klienti?.nazev }
                : undefined;

            addToStats(key, Number(f.castka) || 0, client);
        }

        // 3. Process Sales Invoices (Accounting)
        for (const doc of accountingDocs) {
            if (doc.type !== 'sales_invoice') continue;

            // Filter out internal transfers
            const desc = (doc.description || '').toLowerCase();
            if (desc.includes('převod mezi firemními účty') || desc.includes('peníze na cestě')) continue;

            const d = new Date(doc.tax_date || doc.issue_date);
            const key = getMonthKey(d);

            if (doc.mappings && doc.mappings.length > 0) {
                for (const m of doc.mappings) {
                    // Check logic matches original filter logic...
                    // In original code: we matched filtering against linkedAkce/division/pracovnik.
                    // This creates a dependency on `akceData` to find linkedAkce.

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
                        let val = Number(m.amount_czk);
                        if (!val) val = Number(m.amount) * (doc.currency === 'EUR' ? 25 : doc.currency === 'USD' ? 23 : 1);

                        const client = linkedAkce && linkedAkce.klient_id
                            ? { id: linkedAkce.klient_id, name: Array.isArray(linkedAkce.klienti) ? linkedAkce.klienti[0]?.nazev : linkedAkce.klienti?.nazev }
                            : undefined;

                        addToStats(key, val, client);
                    }
                }
            } else {
                // Unmapped revenue - Only if NO filters active
                if (!filters.klientId && !filters.divisionId && !filters.pracovnikId) {
                    let val = Number(doc.amount_czk);
                    if (!val) val = Number(doc.amount) * (doc.currency === 'EUR' ? 25 : doc.currency === 'USD' ? 23 : 1);
                    addToStats(key, val);
                }
            }
        }

        return result;
    }
};
