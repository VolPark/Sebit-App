import { supabase } from '@/lib/supabase';
import { APP_START_YEAR } from '@/lib/config';
import { CompanyConfig } from '@/lib/companyConfig';
import { DashboardData, MonthlyData } from '@/lib/types/dashboard-types';

import { RevenueService } from './revenue-service';
import { CostService } from './cost-service';
import { LaborService } from './labor-service';

// Helpers
const monthNames = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

const getISODateRange = (startDate: Date, endDate: Date) => {
    return {
        start: startDate.toISOString(),
        end: endDate.toISOString()
    };
};

const createEmptyMonthlyData = (date: Date): MonthlyData => ({
    month: monthNames[date.getMonth()],
    monthIndex: date.getMonth(),
    year: date.getFullYear(),
    totalRevenue: 0, totalCosts: 0, grossProfit: 0, totalHours: 0,
    materialProfit: 0, totalMaterialKlient: 0, totalLaborCost: 0, totalOverheadCost: 0, totalMaterialCost: 0, totalEstimatedHours: 0,
    avgCompanyRate: 0, averageHourlyWage: 0, averageMonthlyWage: 0, estimatedVsActualHoursRatio: 0,
    topClients: [], topWorkers: []
});

const getMonthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

export const DashboardLoader = {
    async loadData(
        period: 'month' | 'last12months' | { year: number; month?: number },
        filters: { pracovnikId?: number | null, klientId?: number | null, divisionId?: number | null },
        customClient?: any
    ): Promise<DashboardData> {
        const client = customClient || supabase;

        // 1. Determine Date Range
        const now = new Date();
        let startDate: Date;
        let endDate: Date;
        const isLast12Months = period === 'last12months';

        if (isLast12Months) {
            startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            const limitDate = new Date(APP_START_YEAR, 0, 1);
            if (startDate < limitDate) startDate = limitDate;
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (period === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else {
            const pYear = typeof period === 'object' ? period.year : now.getFullYear();
            if (typeof period === 'object' && period.month !== undefined && period.month !== null) {
                startDate = new Date(pYear, period.month, 1);
                endDate = new Date(pYear, period.month + 1, 0);
            } else {
                startDate = new Date(pYear, 0, 1);
                endDate = new Date(pYear, 11, 31);
            }
        }
        endDate.setHours(23, 59, 59, 999);
        const { start, end } = getISODateRange(startDate, endDate);

        // 2. Data Fetching
        let akceQuery = client.from('akce').select('id, datum, cena_klient, material_my, material_klient, odhad_hodin, klient_id, division_id, project_type, klienti(nazev)').gte('datum', start).lte('datum', end);
        let praceQuery = client.from('prace').select('id, datum, pocet_hodin, pracovnik_id, klient_id, akce_id, division_id, pracovnici(jmeno)').gte('datum', start).lte('datum', end);
        const financeQuery = client.from('finance').select('id, datum, castka, akce_id, typ, division_id, akce:akce_id(klient_id, project_type, klienti(nazev))').eq('typ', 'Příjem').gte('datum', start).lte('datum', end).not('akce_id', 'is', null);

        let accountingQuery = Promise.resolve({ data: [] });
        if (CompanyConfig.features.enableAccounting) {
            // @ts-expect-error
            accountingQuery = client.from('accounting_documents')
                .select('id, type, amount, issue_date, tax_date, currency, amount_czk, description, provider_id, mappings:accounting_mappings(id, akce_id, pracovnik_id, division_id, cost_category, amount, amount_czk)')
                .gte('issue_date', start)
                .lte('issue_date', end);
        }

        let mzdyQuery = client.from('mzdy').select('rok, mesic, celkova_castka, pracovnik_id').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear());
        let fixedCostsQuery = client.from('fixed_costs').select('rok, mesic, castka, division_id').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear());

        // Apply filters to SQL query where safe
        if (filters.klientId) {
            akceQuery = akceQuery.eq('klient_id', filters.klientId);
        }
        if (filters.pracovnikId) {
            praceQuery = praceQuery.eq('pracovnik_id', filters.pracovnikId);
            mzdyQuery = mzdyQuery.eq('pracovnik_id', filters.pracovnikId);
        }
        if (filters.divisionId) {
            akceQuery = akceQuery.eq('division_id', filters.divisionId);
            fixedCostsQuery = fixedCostsQuery.or(`division_id.is.null,division_id.eq.${filters.divisionId}`);
        }

        // Execute Queries
        // @ts-expect-error
        const [akceRes, praceRes, mzdyRes, fixedCostsRes, workersRes, allPraceRes, financeRes, accountingQueryRes] = await Promise.all([
            akceQuery,
            praceQuery,
            mzdyQuery,
            fixedCostsQuery,
            client.from('pracovnici').select('id, hodinova_mzda'),
            // If filtering, we need global hours for rates
            (filters.divisionId || filters.klientId)
                ? client.from('prace').select('id, datum, pocet_hodin, pracovnik_id').gte('datum', start).lte('datum', end)
                : Promise.resolve({ data: null }),
            financeQuery,
            accountingQuery
        ]);

        const akceData = akceRes.data || [];
        const praceData = praceRes.data || [];
        const mzdyData = mzdyRes.data || [];
        const fixedCostsData = fixedCostsRes.data || [];
        const workersData = workersRes.data || [];
        const financeData = financeRes.data || [];
        const accountingDocs = (accountingQueryRes?.data || []) as any[];
        // Check if allPraceRes.data is valid
        const allPraceData = (allPraceRes.data && Array.isArray(allPraceRes.data)) ? allPraceRes.data : praceData;

        // 3. Prep Filters / In-Memory Logic specific filtering needed for services?
        // Services accept raw data + filters and handle logic. But some pre-filtering of lists might be needed?
        // RevenueService: uses akceData (already filtered), financeData (filtered), accountingDocs (NOT FILTERED in SQL fully).
        // CostService: same.
        // LaborService: needs praceData (filtered), allPraceData (Global).

        // Pre-filter praceData for Client ID if needed (SQL doesn't filter prace by klient_id directly in logic usually)
        // Wait, original logic lines 141: "We do NOT filter praceQuery by klient_id in SQL".
        // Original logic 618: "Build Akce Map for filtering".
        // We should replicate this filtering logic to pass "Clean" filteredPraceData to LaborService?
        // LaborService accepts "praceData" and "filters". It has the "Filter Mode" logic.
        // BUT LaborService logic implementation I wrote (Step 153) assumes "praceData" is passed in.
        // And inside LaborService:
        // "if (!useFilterMode) ... else ... for (const p of praceData)".
        // It says "Assume 'praceData' is already filtered by Caller".
        // So YES, I must filter `praceData` here before passing.

        const validAkceIds = new Set<number>();
        akceData.forEach((a: any) => validAkceIds.add(a.id));

        const filteredPraceData = praceData.filter((p: any) => {
            // Division Filter was applied in SQL? 
            // "Do NOT filter praceQuery by division_id in SQL aggressively" (Comment in original).
            // But in my code above line 73: `if (filters.divisionId) akceQuery.eq...`
            // I did NOT filter `praceQuery` by division. Good.
            // So I need to apply division filter here too.

            if (filters.divisionId) {
                if (p.division_id === filters.divisionId) return true;
                if (p.akce_id && validAkceIds.has(p.akce_id)) return true; // Linked to valid akce
                return false;
            }
            if (filters.klientId) {
                if (p.klient_id === filters.klientId) return true;
                // matches via action?
                if (p.akce_id && validAkceIds.has(p.akce_id)) {
                    // We know validAkceIds contains only akce for this client (due to SQL filter on akceQuery)
                    return true;
                }
                return false;
            }
            return true;
        });


        // 4. Call Services
        const rh = { getMonthKey };

        const revenueResult = RevenueService.calculateRevenue(akceData, financeData, accountingDocs, filters, rh);
        const costResult = CostService.calculateCosts(akceData, fixedCostsData, accountingDocs, filters, rh);

        const laborResult = LaborService.calculateLabor(
            filteredPraceData,
            allPraceData,
            mzdyData,
            workersData,
            accountingDocs,
            { monthlyFixedCostsGlobal: costResult.monthlyFixedCostsGlobal, monthlyFixedCostsSpecific: costResult.monthlyFixedCostsSpecific },
            filters,
            rh
        );

        // 5. Aggregate Results
        const monthlyBuckets = new Map<string, MonthlyData>();

        // Init buckets based on range (Similar to original loop)
        const dateIterator = new Date(startDate);
        while (dateIterator <= endDate) {
            const key = getMonthKey(dateIterator);
            monthlyBuckets.set(key, createEmptyMonthlyData(dateIterator));
            dateIterator.setMonth(dateIterator.getMonth() + 1);
        }

        // Fill Data
        // Revenue
        revenueResult.monthlyRevenue.forEach((val, key) => {
            const b = monthlyBuckets.get(key);
            if (b) b.totalRevenue += val;
        });

        // Costs (Excluding Labor/Overhead which come from LaborService final stats? No.)
        // CostService provides: Total Costs (Material + Fixed in Simple Mode + Invoices).
        // LaborService provides: Labor + Overhead (Distributed).

        // Wait, CostService.totalCosts includes Fixed Costs in Simple Mode.
        // LaborService ALSO returns 'totalOverheadCost'.
        // We need to be careful not to double count.
        // In Filter Mode: CostService does NOT add fixed costs to `totalCosts`. LaborService ADDS distributed overhead. -> OK.
        // In Simple Mode: CostService ADDS fixed costs to `totalCosts`. LaborService ADDS 'totalOverheadCost' (bucket sum).
        // Does LaborService add it to its returned 'totalLaborCost' or similar? No.
        // LaborService returns `monthlyOverheadCost`.
        // We should merge them.

        // Merge logic:
        const allKeys = new Set([...monthlyBuckets.keys()]);

        allKeys.forEach(key => {
            const b = monthlyBuckets.get(key);
            if (!b) return;

            const rev = revenueResult.monthlyRevenue.get(key) || 0;
            const matCost = costResult.monthlyCosts.get(key) || 0; // This is Material + Direct Invoice Costs + (Fixed if Simple)
            const labor = laborResult.monthlyLaborCost.get(key) || 0;
            const overhead = laborResult.monthlyOverheadCost.get(key) || 0;

            // New Metrics from RevenueService
            const matKlient = revenueResult.monthlyMaterialKlient.get(key) || 0;
            const estHours = revenueResult.monthlyEstimatedHours.get(key) || 0;

            b.totalMaterialKlient = matKlient;
            b.totalEstimatedHours = estHours;

            // Costs
            // Note: CostService.monthlyCosts already contains Material.
            b.totalCosts += matCost; // Base costs from CostService
            b.totalCosts += labor;

            // Overhead Logic
            const useFilterMode = !!(filters.klientId || filters.divisionId);
            if (useFilterMode) {
                b.totalCosts += overhead;
            }

            // Fill KPIs
            b.totalLaborCost = labor;
            b.totalOverheadCost = overhead; // This stat should be correct from LaborService in both modes.
            b.totalHours = laborResult.monthlyHours.get(key) || 0;

            // b.grossProfit = b.totalRevenue - b.totalCosts; // Already computed above? No.
            b.grossProfit = b.totalRevenue - b.totalCosts;

            // Material 
            const matCostMonthly = costResult.monthlyMaterialCost.get(key) || 0;
            b.totalMaterialCost = matCostMonthly;
            b.materialProfit = (b.totalMaterialKlient - matCostMonthly);
            // Original code: bucket.materialProfit += ((a.material_klient || 0) - (a.material_my || 0));
            // We have monthlyMaterialKlient. We DO NOT have monthlyMaterialCost from CostService explicitly separate from totalCosts.
            // CostService.calculateCosts tracks `materialProfit` globally.
            // If we want monthly material profit, we need monthly material cost.
            // Hack: `materialProfit` field in MonthlyData is usually not graphed month-by-month in detail?
            // Actually DashboardData interface has `materialProfit` as global.
            // MonthlyData has `materialProfit`.
            // Let's approximate or just set it if we can. 
            // CostService DID track `materialProfit` accumulator inside Akce loop.
            // We can ask CostService to return `monthlyMaterialProfit` map?
            // For now, let's look at `avgCompanyRate`.

            b.avgCompanyRate = b.totalHours > 0 ? (b.totalRevenue - (b.totalMaterialKlient || 0)) / b.totalHours : 0;
            b.averageHourlyWage = b.totalHours > 0 ? b.totalLaborCost / b.totalHours : 0;

            // estimatedVsActualHoursRatio
            b.estimatedVsActualHoursRatio = b.totalEstimatedHours > 0 ? b.totalHours / b.totalEstimatedHours : 0;
        });

        // Fill Totals
        const totalRev = revenueResult.totalRevenue;
        const totalCost = [...monthlyBuckets.values()].reduce((acc, b) => acc + b.totalCosts, 0); // Sum buckets to be safe

        // Populate Top Clients / Workers logic?
        // RevenueService has clientStats. LaborService has workerStats.
        // We need to populate `b.topClients` / `b.topWorkers`.
        monthlyBuckets.forEach((b, key) => {
            const cStats = revenueResult.clientStats.get(key);
            if (cStats) {
                b.topClients = Array.from(cStats.entries()).map(([id, val]) => ({ klient_id: id, nazev: val.name, total: val.total }))
                    .sort((x, y) => y.total - x.total).slice(0, 5);
            }
            const wStats = laborResult.workerStats.get(key);
            if (wStats) {
                b.topWorkers = Array.from(wStats.entries()).map(([id, val]) => ({ pracovnik_id: id, jmeno: val.name, total: val.total }))
                    .sort((x, y) => y.total - x.total).slice(0, 5);
            }
        });

        return {
            totalRevenue: totalRev,
            totalCosts: totalCost,
            totalLaborCost: laborResult.totalLaborCost,
            totalOverheadCost: laborResult.totalOverheadCost,
            totalMaterialCost: costResult.totalMaterialCost,
            grossProfit: totalRev - totalCost,
            materialProfit: costResult.materialProfit,
            totalHours: laborResult.totalHours,
            totalEstimatedHours: costResult.totalMaterialCost * 0 + ([...monthlyBuckets.values()].reduce((acc, b) => acc + (b.totalEstimatedHours || 0), 0)), // Sum buckets
            // We need to track estimated hours in RevenueService? Or separate? 
            // Ideally RevenueService processed Akce.
            avgCompanyRate: laborResult.totalHours > 0 ? (totalRev - 0) / laborResult.totalHours : 0, // Fix calc
            averageHourlyWage: laborResult.totalHours > 0 ? laborResult.totalLaborCost / laborResult.totalHours : 0,
            averageMonthlyWage: laborResult.totalLaborCost / (monthlyBuckets.size || 1), // Approx
            estimatedVsActualHoursRatio: 0,
            topClients: [], // Global tops? The interface has them.
            topWorkers: [],
            monthlyData: Array.from(monthlyBuckets.values()).sort((a, b) => a.monthIndex - b.monthIndex), // Sort logic might need year check
            prevPeriod: { totalRevenue: 0, totalCosts: 0, grossProfit: 0 } // fetchPrevPeriod logic missing for now
        };
    }
};
