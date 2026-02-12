import { supabase } from '@/lib/supabase';
import { APP_START_YEAR } from '@/lib/config';
import { CompanyConfig } from '@/lib/companyConfig';
import { MonthlyData, DashboardData } from '@/lib/types/dashboard-types';

// Re-export types for backward compatibility
export type { MonthlyData, DashboardData } from '@/lib/types/dashboard-types';

// Helper to get month name
const monthNames = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

const getISODateRange = (startDate: Date, endDate: Date) => {
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
};

// Helper to create an empty MonthlyData object
const createEmptyMonthlyData = (date: Date): MonthlyData => ({
  month: monthNames[date.getMonth()],
  monthIndex: date.getMonth(),
  year: date.getFullYear(),
  totalRevenue: 0, totalCosts: 0, grossProfit: 0, totalHours: 0,
  materialProfit: 0, totalMaterialKlient: 0, totalLaborCost: 0, totalOverheadCost: 0, totalMaterialCost: 0, totalEstimatedHours: 0,
  avgCompanyRate: 0, averageHourlyWage: 0, averageMonthlyWage: 0, estimatedVsActualHoursRatio: 0,
  topClients: [], topWorkers: []
});

// Main data fetching function
// Main data fetching function
// Main data fetching function - OPTIMIZED
export async function getDashboardData(
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

  // Define Filter Mode early
  const useFilterMode = !!(filters.klientId || filters.divisionId);

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

  // 2. Prepare Queries (Bulk Fetch)
  let akceQuery = client.from('akce').select('id, datum, cena_klient, material_my, material_klient, odhad_hodin, klient_id, division_id, project_type, klienti(nazev)').gte('datum', start).lte('datum', end);
  let praceQuery = client.from('prace').select('id, datum, pocet_hodin, pracovnik_id, klient_id, akce_id, division_id, pracovnici(jmeno)').gte('datum', start).lte('datum', end);
  const financeQuery = client.from('finance').select('id, datum, castka, akce_id, typ, division_id, akce:akce_id(klient_id, project_type, klienti(nazev))').eq('typ', 'Příjem').gte('datum', start).lte('datum', end).not('akce_id', 'is', null);

  // Accounting Query (if enabled)
  let accountingQuery = Promise.resolve({ data: [] });
  if (CompanyConfig.features.enableAccounting) {
    // Fetch documents with mappings for the period
    // @ts-ignore
    accountingQuery = client.from('accounting_documents')
      .select('id, type, amount, issue_date, tax_date, currency, amount_czk, description, provider_id, mappings:accounting_mappings(id, akce_id, pracovnik_id, division_id, cost_category, amount, amount_czk)')
      .gte('issue_date', start)
      .lte('issue_date', end);
  }

  // Mzdy needs a slightly wider range to be safe or just matching years. Always GLOBAL for rate calc.
  let mzdyQuery = client.from('mzdy').select('rok, mesic, celkova_castka, pracovnik_id').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear());

  let fixedCostsQuery = client.from('fixed_costs').select('rok, mesic, castka, division_id').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear());

  // Apply Filters
  if (filters.klientId) {
    akceQuery = akceQuery.eq('klient_id', filters.klientId);
    // For client filter, we do NOT filter praceQuery by klient_id in SQL.
    // We will filter in memory later using the actionClientMap logic.
  }
  if (filters.pracovnikId) {
    praceQuery = praceQuery.eq('pracovnik_id', filters.pracovnikId);
    // If filtering by worker, we still fetch all mzdy for rate calc? No, we can fetch only this worker's mzdy.
    mzdyQuery = mzdyQuery.eq('pracovnik_id', filters.pracovnikId);
  }
  if (filters.divisionId) {
    akceQuery = akceQuery.eq('division_id', filters.divisionId);
    // Do NOT filter praceQuery by division_id in SQL aggressively, because:
    // 1. Most trace rows have division_id = NULL (legacy).
    // 2. We need to include prace linked to akce that belong to this division.
    // We will filter praceData in memory using the set of valid Akce IDs + direct division_id check.

    // For Fixed Costs: Fetch GLOBAL (null) AND Specific Division costs
    fixedCostsQuery = fixedCostsQuery.or(`division_id.is.null,division_id.eq.${filters.divisionId}`);
  }

  // 3. Execute Parallel Queries
  // @ts-ignore
  const [akceRes, praceRes, mzdyRes, fixedCostsRes, workersRes, allPraceRes, financeRes, accountingQueryRes] = await Promise.all([
    akceQuery,
    praceQuery,
    mzdyQuery,
    fixedCostsQuery,
    client.from('pracovnici').select('id, hodinova_mzda'),
    // If filtering by division/client, we need GLOBAL hours to calculate correct overhead/worker rates
    (filters.divisionId || filters.klientId)
      ? client.from('prace').select('id, datum, pocet_hodin, pracovnik_id').gte('datum', start).lte('datum', end)
      : Promise.resolve({ data: null }),
    financeQuery,
    accountingQuery
  ]);

  const akceData = akceRes.data || [];
  const praceData = praceRes.data || []; // Filtered data
  const mzdyData = mzdyRes.data || [];
  const fixedCostsData = fixedCostsRes.data || [];
  const workersData = workersRes.data || [];
  const financeData = financeRes.data || [];
  // @ts-ignore
  const accountingDocs = (accountingQueryRes?.data || []) as any[];

  // --- PRE-PROCESS: Mapped Labor Costs ---
  // Map: `${pracovnikId}-${year}-${month}` -> Amount
  const workerMonthlyMappedLabor = new Map<string, number>();

  if (CompanyConfig.features.enableAccounting && accountingDocs.length > 0) {
    for (const doc of accountingDocs) {
      if (doc.mappings && doc.mappings.length > 0) {
        const d = new Date(doc.tax_date || doc.issue_date);
        const keySuffix = `${d.getFullYear()}-${d.getMonth()}`; // month is 0-indexed in getMonth()

        for (const m of doc.mappings) {
          if (m.pracovnik_id) {
            const key = `${m.pracovnik_id}-${keySuffix}`;
            // Use amount_czk if available, else fallback
            let val = Number(m.amount_czk);
            if (!val) {
              val = Number(m.amount) * (doc.currency === 'EUR' ? 25 : doc.currency === 'USD' ? 23 : 1);
            }
            workerMonthlyMappedLabor.set(key, (workerMonthlyMappedLabor.get(key) || 0) + (val || 0));
          }
        }
      }
    }
  }

  // Use allPraceRes if available (global context), otherwise praceData (if no filters)
  // Check if allPraceRes.data is valid array, else use praceData
  const allPraceDataForRates = (allPraceRes.data && Array.isArray(allPraceRes.data)) ? allPraceRes.data : praceData;

  // Map base rates
  const workerBaseRateMap = new Map<number, number>();
  workersData.forEach((w: any) => {
    workerBaseRateMap.set(w.id, Number(w.hodinova_mzda) || 0);
  });

  // 4. Client-Side Aggregation
  const monthlyBuckets = new Map<string, MonthlyData>();
  const monthlyClientStats = new Map<string, Map<number, { name: string, total: number }>>();
  const monthlyWorkerStats = new Map<string, Map<number, { name: string, total: number }>>();

  const getMonthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
  const getMonthLabel = (monthIndex: number) => monthNames[monthIndex];

  // Pre-fill buckets
  if (isLast12Months) {
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const key = getMonthKey(curr);
      if (!monthlyBuckets.has(key)) {
        monthlyBuckets.set(key, createEmptyMonthlyData(curr));
        monthlyClientStats.set(key, new Map());
        monthlyWorkerStats.set(key, new Map());
      }
      curr.setMonth(curr.getMonth() + 1);
    }
  } else if (typeof period === 'object' && period.year) {
    if (period.month === undefined) {
      // Whole Year
      for (let m = 0; m < 12; m++) {
        const d = new Date(period.year, m, 1);
        const key = getMonthKey(d);
        if (!monthlyBuckets.has(key)) {
          monthlyBuckets.set(key, createEmptyMonthlyData(d));
          monthlyClientStats.set(key, new Map());
          monthlyWorkerStats.set(key, new Map());
        }
      }
    } else {
      // Specific Month
      const d = new Date(period.year, period.month, 1);
      const key = getMonthKey(d);
      if (!monthlyBuckets.has(key)) {
        monthlyBuckets.set(key, createEmptyMonthlyData(d));
        monthlyClientStats.set(key, new Map());
        monthlyWorkerStats.set(key, new Map());
      }
    }
  } else if (period === 'month') {
    // Current Month
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    const key = getMonthKey(d);
    if (!monthlyBuckets.has(key)) {
      monthlyBuckets.set(key, createEmptyMonthlyData(d));
      monthlyClientStats.set(key, new Map());
      monthlyWorkerStats.set(key, new Map());
    }
  }

  // A. Process Akce (Revenue, Material)
  for (const a of akceData) {
    const d = new Date(a.datum);
    const key = getMonthKey(d);

    const bucket = monthlyBuckets.get(key);
    if (bucket) {
      if ((a.project_type || 'STANDARD') === 'STANDARD') {
        bucket.totalRevenue += (a.cena_klient || 0);
      }
      bucket.totalMaterialKlient += (a.material_klient || 0);
      bucket.materialProfit += ((a.material_klient || 0) - (a.material_my || 0));
      bucket.totalCosts += (a.material_my || 0);
      bucket.totalMaterialCost += (a.material_my || 0);
      bucket.totalEstimatedHours += (a.odhad_hodin || 0);
    }

    if (a.klient_id && a.klienti) {
      if (!monthlyClientStats.has(key)) monthlyClientStats.set(key, new Map());
      const cMap = monthlyClientStats.get(key)!;
      // @ts-ignore
      const cName = Array.isArray(a.klienti) ? a.klienti[0]?.nazev : a.klienti?.nazev;
      const currC = cMap.get(a.klient_id) || { name: cName || 'Neznámý', total: 0 };
      if ((a.project_type || 'STANDARD') === 'STANDARD') {
        currC.total += (a.cena_klient || 0);
      }
      cMap.set(a.klient_id, currC);
    }
  }

  // A2. Process Service/TM Revenue (from Finance)
  for (const f of financeData) {
    // Check validity and filtering
    const fAction = f.akce; // joined data
    if (!fAction) continue;

    // Ensure we only count revenue for non-standard projects (Standard handled above)
    // Actually, finance records for Standard projects might exist too (invoices), but our logic says Standard Revenue = Fixed Price.
    // So we only ADD revenue from finance if project_type != STANDARD to avoid double counting or conflict.
    // OR if it is STANDARD, we ignore finance for "Revenue" calculation here? Yes.
    if ((fAction.project_type || 'STANDARD') === 'STANDARD') continue;

    const d = new Date(f.datum);
    const key = getMonthKey(d);

    const bucket = monthlyBuckets.get(key);
    if (bucket) {
      bucket.totalRevenue += (Number(f.castka) || 0);
    }

    if (fAction.klient_id) {
      if (!monthlyClientStats.has(key)) monthlyClientStats.set(key, new Map());
      const cMap = monthlyClientStats.get(key)!;
      const cName = Array.isArray(fAction.klienti) ? fAction.klienti[0]?.nazev : fAction.klienti?.nazev;
      const currC = cMap.get(fAction.klient_id) || { name: cName || 'Neznámý', total: 0 };
      currC.total += (Number(f.castka) || 0);
      cMap.set(fAction.klient_id, currC);
    }
  }

  // A3. Process Accounting Mappings
  if (CompanyConfig.features.enableAccounting && accountingDocs.length > 0) {
    for (const doc of accountingDocs) {
      const d = new Date(doc.tax_date || doc.issue_date);
      const key = getMonthKey(d);

      const bucket = monthlyBuckets.get(key);
      if (!bucket) continue;

      // Filter out internal transfers
      const desc = (doc.description || '').toLowerCase();
      if (
        desc.includes('převod mezi firemními účty') ||
        desc.includes('převod mezi vlastními účty') ||
        desc.includes('peníze na cestě') ||
        (desc.includes('převod') && desc.includes('účt')) // Broader catch for transfers
      ) {
        continue;
      }

      // Check doc type
      if (doc.type === 'sales_invoice') {
        // Revenue
        if (doc.mappings && doc.mappings.length > 0) {
          for (const m of doc.mappings) {
            // Filter Check
            let matchesFilter = true;
            const linkedAkce = m.akce_id ? akceData.find((a: any) => a.id === m.akce_id) : null;

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

              bucket.totalRevenue += val;

              // Client Stats
              if (linkedAkce && linkedAkce.klient_id) {
                if (!monthlyClientStats.has(key)) monthlyClientStats.set(key, new Map());
                const cMap = monthlyClientStats.get(key)!;
                const cName = Array.isArray(linkedAkce.klienti) ? linkedAkce.klienti[0]?.nazev : linkedAkce.klienti?.nazev;
                const currC = cMap.get(linkedAkce.klient_id) || { name: cName || 'Neznámý', total: 0 };
                currC.total += val;
                cMap.set(linkedAkce.klient_id, currC);
              }
            }
          }
        } else {
          // Unmapped revenue - Only add if NO filters active (Global view)
          if (!filters.klientId && !filters.divisionId && !filters.pracovnikId) {
            let val = Number(doc.amount_czk);
            if (!val) val = Number(doc.amount) * (doc.currency === 'EUR' ? 25 : doc.currency === 'USD' ? 23 : 1);
            bucket.totalRevenue += val;
          }
        }
      } else if (doc.type === 'purchase_invoice') {
        // Costs
        if (doc.mappings && doc.mappings.length > 0) {
          for (const m of doc.mappings) {
            let matchesFilter = true;
            const linkedAkce = m.akce_id ? akceData.find((a: any) => a.id === m.akce_id) : null;

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
              // SKIP LABOR: If mapped to a worker, it counts as Labor Cost (Wage), not generic cost here.
              if (m.pracovnik_id) continue;

              let val = Number(m.amount_czk);
              if (!val) val = Number(m.amount) * (doc.currency === 'EUR' ? 25 : doc.currency === 'USD' ? 23 : 1);

              bucket.totalCosts += val;
              if (m.cost_category === 'material') {
                bucket.totalMaterialCost += val;
                // Deduct mapping cost from "Profit from Material" (since it is a cost)
                // Profit = Revenue - Cost. 
                bucket.materialProfit -= val;
              } else if (m.cost_category === 'overhead') {
                // Only count as "Company Overhead" if NOT linked to a project.
                // Project-linked overheads are Direct Costs.
                if (!m.akce_id) {
                  // CHANGED: Do NOT add here directly. 
                  // If it is an unlinked overhead, it acts as "Fixed Cost" and is distributed via Overhead Rate.
                  // We add it to 'bucket.totalOverheadCost' ONLY if we are in Global Mode (Implicitly via rate? No, via Rate Summation or Direct?).
                  // Wait, 'bucket.totalOverheadCost' in simple mode is just a sum.
                  // But 'bucket.totalCosts' DOES need it?
                  // If we treat it as Rate, it will be added to totalCosts via Labor Loop (TotalItemCost).
                  // So we MUST NOT add it here to totalCosts either if we want to avoid double counting for the "Distributed" logic.

                  // BUT: In "Global View" without rate logic (Simple Mode), we DO need to add it?
                  // We are trying to UNIFY logic.
                  // If we use 'Distributed Logic' for everything, then 'totalCosts' will include it via 'overheadCost' component of labor loop (if Filter Mode).
                  // What about NO Filter Mode?
                  // In NO Filter Mode, we iterate workerMonthTotalCost (Labor) + filteredPraceData (Hours).
                  // In existing code (Simple Mode), we sum LaborCost + Material + "Overhead from bucket"?
                  // Let's look at lines 585+ (Simple Mode).
                  // It sums LaborCost. It sums Material (via previous loop).
                  // It does NOT explicitly sum OverheadRate * Hours.
                  // So in Simple Mode, we rely on 'bucket.totalOverheadCost' being populated HERE.

                  // PROBLEM: If we populate it HERE, it is NOT distributed.
                  // Solution: We should populate it here (for Simple Global View matching), BUT...
                  // The user wants distribution even for Global View? (To match sum of Divisions).
                  // If we want Sum(Divisions) == Global, then Global View must ALSO use Distributed Logic?
                  // Or at least, the "bucket.totalOverheadCost" should be equal to "Total Rate * Total Hours".
                  // Theoretically, Total Rate * Total Hours == Total Fixed Costs.
                  // So sticking to "Add to Bucket" here is mathematically equivalent to "Rate * Hours" (if Hours cover everything).

                  // CRITICAL: If we are in Filter Mode, we MUST SKIP adding it here, because it will be added via Rate.
                  // If we are in Global Mode (Simple Mode), we can add it here.

                  if (!useFilterMode) {
                    bucket.totalOverheadCost += val;
                    // bucket.totalCosts += val; // Wait, totalCosts is sum of all components.
                    // If we add it here, we are good.
                  } else {
                    // In Filter Mode: We SKIP adding it here.
                    // It will be added via 'overheadCost' in the Labor Loop.
                    // IMPORTANT: We must NOT add it to 'bucket.totalCosts' here either in Filter Mode.
                    bucket.totalCosts -= val; // Hack? No.
                    // Just don't add it.
                    // But we already added 'val' to 'bucket.totalCosts' above (line 411).
                    // So we need to subtract it if we are skipping.
                    bucket.totalCosts -= val;
                  }
                }
              }
            }
          }
        } else {
          // Unmapped cost
          if (!filters.klientId && !filters.divisionId && !filters.pracovnikId) {
            let val = Number(doc.amount_czk);
            if (!val) val = Number(doc.amount) * (doc.currency === 'EUR' ? 25 : doc.currency === 'USD' ? 23 : 1);
            bucket.totalCosts += val;
          }
        }
      }
    }
  }

  // B. Process Labor Costs

  // Calc Rates using GLOBAL data (allPraceDataForRates)
  const workerMonthHours = new Map<string, number>();
  for (const p of allPraceDataForRates) {
    const d = new Date(p.datum);
    const key = `${p.pracovnik_id}-${d.getFullYear()}-${d.getMonth()}`;
    workerMonthHours.set(key, (workerMonthHours.get(key) || 0) + (p.pocet_hodin || 0)); // Global hours
  }

  // Calculate Rates (Mzdy + Mapped Labor)
  const workerMonthTotalCost = new Map<string, number>();

  // 1. From Mzdy
  for (const m of mzdyData) {
    const key = `${m.pracovnik_id}-${m.rok}-${m.mesic - 1}`;
    workerMonthTotalCost.set(key, (workerMonthTotalCost.get(key) || 0) + (Number(m.celkova_castka) || 0));
  }
  // 2. From Mapped Labor
  workerMonthlyMappedLabor.forEach((amount: number, key: string) => {
    workerMonthTotalCost.set(key, (workerMonthTotalCost.get(key) || 0) + amount);
  });

  const workerMonthRate = new Map<string, number>();
  workerMonthTotalCost.forEach((totalCost, key) => {
    const hours = workerMonthHours.get(key) || 0;
    const parts = key.split('-');
    const pId = parseInt(parts[0]);

    if (hours > 0) {
      let calculatedRate = totalCost / hours;
      const baseRate = workerBaseRateMap.get(pId) || 0;
      if (baseRate > 0 && calculatedRate > (baseRate * 1.5)) {
        calculatedRate = baseRate;
      }
      workerMonthRate.set(key, calculatedRate);
    }
  });

  // Overhead Rates (Use Fixed Costs from Query - filtering applied if division selected)
  // Calculate Overhead Rate (Global + Specific)
  const monthlyOverheadRate = new Map<string, number>();

  // Logic: 
  // 1. Global Overhead Rate = (Total Global Fixed Costs) / (Total Company Hours)
  // 2. Specific Division Rate = (Total Specific Fixed Costs) / (Total Division Hours)
  // 3. Rate applied to a division hour = Global Rate + Specific Rate

  // A. Separate Costs
  let totalGlobalFixedCosts = 0;
  let totalSpecificFixedCosts = 0;
  const monthlyGlobalFixedCosts = new Map<string, number>();
  const monthlySpecificFixedCosts = new Map<string, number>();

  // Optimize Filter Mode check (Declared at top)
  // const useFilterMode = !!(filters.klientId || filters.divisionId);

  fixedCostsData.forEach((fc: any) => {
    const key = `${fc.rok}-${fc.mesic - 1}`;
    const amount = Number(fc.castka) || 0;

    // Explicit Overhead Tracking: Add Fixed Costs to bucket (ONCE)
    // ONLY in Global Mode. In Filter Mode, we add distributed overheads.
    if (!useFilterMode) {
      const d = new Date(fc.rok, fc.mesic - 1, 1);
      const bucketStartKey = getMonthKey(d);
      const bucket = monthlyBuckets.get(bucketStartKey);

      // Only add if bucket exists and is in range
      if (bucket) {
        bucket.totalOverheadCost += amount;
        bucket.totalCosts += amount;
      }
    }

    if (fc.division_id) {
      // Specific Rate Map
      totalSpecificFixedCosts += amount;
      monthlySpecificFixedCosts.set(key, (monthlySpecificFixedCosts.get(key) || 0) + amount);
    } else {
      // Global Rate Map
      totalGlobalFixedCosts += amount;
      monthlyGlobalFixedCosts.set(key, (monthlyGlobalFixedCosts.get(key) || 0) + amount);
    }
  });

  // Pre-Process Invoice Overheads for Rates
  // Iterate accountingDocs again (unfiltered by our main loops, but filtered by date/division logic?)
  // We need "Global" Invoice Overheads.
  // The accountingDocs array contains docs in the DATE range.
  if (CompanyConfig.features.enableAccounting && accountingDocs.length > 0) {
    for (const doc of accountingDocs) {
      // Only Purchase Invoices
      if (doc.type === 'purchase_invoice' && doc.mappings && doc.mappings.length > 0) {
        const d = new Date(doc.tax_date || doc.issue_date);
        const key = `${d.getFullYear()}-${d.getMonth()}`; // Matches fixedCosts key format (YYYY-M, 0-indexed month)

        for (const m of doc.mappings) {
          // We care about "overhead" that is unlinked (no akce_id)
          if (m.cost_category === 'overhead' && !m.akce_id) {
            let val = Number(m.amount_czk);
            if (!val) val = Number(m.amount) * (doc.currency === 'EUR' ? 25 : doc.currency === 'USD' ? 23 : 1);

            if (m.division_id) {
              // Specific Division Overhead
              monthlySpecificFixedCosts.set(key, (monthlySpecificFixedCosts.get(key) || 0) + val);
            } else {
              // Global Overhead
              monthlyGlobalFixedCosts.set(key, (monthlyGlobalFixedCosts.get(key) || 0) + val);
            }
          }
        }
      }
    }
  }

  // B. Separate Hours
  // Global Hours: use `allPraceRes` (which is period wide). 
  // Division Hours: use `praceData` (filtered by division). 
  //   Wait, we haven't filtered `praceData` yet in memory! We removed the SQL filter.
  //   So `praceData` currently contains ALL rows (filtered only by date).
  //   We MUST generate `filteredPraceData` first.

  // Build Akce Map for filtering
  const validAkceIds = new Set<number>();
  akceData.forEach((a: any) => validAkceIds.add(a.id));

  const filteredPraceData = !filters.divisionId ? praceData : praceData.filter((p: any) => {
    // 1. Direct match
    if (p.division_id === filters.divisionId) return true;
    // 2. Linked to valid Akce (which is filtered by division)
    if (p.akce_id && validAkceIds.has(p.akce_id)) return true;
    return false;
  });

  // Now calculation:
  // Global Hours Map
  const monthlyGlobalHours = new Map<string, number>();
  allPraceDataForRates.forEach((p: any) => {
    const d = new Date(p.datum);
    const key = getMonthKey(d);
    monthlyGlobalHours.set(key, (monthlyGlobalHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
  });

  // Division Hours Map (for specific rate)
  const monthlyDivisionHours = new Map<string, number>();
  filteredPraceData.forEach((p: any) => {
    const d = new Date(p.datum);
    const key = getMonthKey(d);
    monthlyDivisionHours.set(key, (monthlyDivisionHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
  });

  // C. Compute Combined Rate per Month
  // Iterate all months present in either costs or hours
  const allMonths = new Set([...monthlyGlobalFixedCosts.keys(), ...monthlySpecificFixedCosts.keys(), ...monthlyGlobalHours.keys()]);

  allMonths.forEach(key => {
    let rate = 0;

    // 1. Global Part
    const globalCost = monthlyGlobalFixedCosts.get(key) || 0;
    const globalHours = monthlyGlobalHours.get(key) || 0;
    if (globalHours > 0) {
      rate += (globalCost / globalHours);
    }

    // 2. Specific Part
    if (filters.divisionId) {
      const specificCost = monthlySpecificFixedCosts.get(key) || 0;
      const divisionHours = monthlyDivisionHours.get(key) || 0;
      if (divisionHours > 0) {
        rate += (specificCost / divisionHours);
      }
    }

    monthlyOverheadRate.set(key, rate);
  });


  // Aggregate Labor
  // If ANY filter is active (Client OR Division), we MUST use "Filter Mode" (Iterate Prace)
  // const useFilterMode = !!(filters.klientId || filters.divisionId); // Moved to top // Defined above

  if (!useFilterMode) {
    // Simple Mode: Sum Mzdy
    // Simple Mode: Sum Labor Costs (Mzdy + Mapped)
    // Iterate workerMonthTotalCost which contains combined totals
    workerMonthTotalCost.forEach((laborCost, rateKey) => {
      // rateKey is "pid-YYYY-M" (M is 0-indexed)
      const parts = rateKey.split('-');
      const pId = parseInt(parts[0]);
      const year = parseInt(parts[1]);
      const monthIndex = parseInt(parts[2]);

      const d = new Date(year, monthIndex, 1);
      const key = getMonthKey(d);

      const bucket = monthlyBuckets.get(key);
      if (bucket) {
        const finalLaborCost = laborCost;
        // Fallback checks (Cap Logic)

        bucket.totalLaborCost += finalLaborCost;
        bucket.totalCosts += finalLaborCost;
      }
    });
    // Sum hours from filteredPraceData (was praceData)
    for (const p of filteredPraceData) {
      const d = new Date(p.datum);
      const key = getMonthKey(d);
      const bucket = monthlyBuckets.get(key);
      if (bucket) bucket.totalHours += (p.pocet_hodin || 0);

      if (p.pracovnik_id && p.pracovnici) {
        if (!monthlyWorkerStats.has(key)) monthlyWorkerStats.set(key, new Map());
        const wMap = monthlyWorkerStats.get(key)!;
        // @ts-ignore
        const wName = Array.isArray(p.pracovnici) ? p.pracovnici[0]?.jmeno : p.pracovnici?.jmeno;
        const currW = wMap.get(p.pracovnik_id) || { name: wName || 'Neznámý', total: 0 };
        currW.total += (p.pocet_hodin || 0);
        wMap.set(p.pracovnik_id, currW);
      }
    }
  } else {
    // Filter Mode: Iterate Prace (which is filtered by SQL for division, and will be filtered in-memory for client)
    const actionClientMap = new Map<number, number>();
    akceData.forEach((a: any) => {
      if (a.klient_id) actionClientMap.set(a.id, a.klient_id);
    });

    for (const p of filteredPraceData) {
      // In-memory filter for klientId (since praceQuery is not filtered by klient_id in SQL)
      if (filters.klientId) {
        const matchesDirectly = p.klient_id === filters.klientId;
        const matchesViaAction = p.akce_id && actionClientMap.has(p.akce_id);
        if (!matchesDirectly && !matchesViaAction) continue;
      }
      // divisionId filter is already applied via filteredPraceData
      // pracovnikId filter is already applied by SQL in praceQuery

      const d = new Date(p.datum);
      const key = getMonthKey(d);
      const rateKey = `${p.pracovnik_id}-${d.getFullYear()}-${d.getMonth()}`;
      const rate = workerMonthRate.get(rateKey) || 0;

      const laborCost = (p.pocet_hodin || 0) * rate;
      const overheadRate = monthlyOverheadRate.get(key) || 0;
      const overheadCost = (p.pocet_hodin || 0) * overheadRate;
      const totalItemCost = laborCost + overheadCost;

      const bucket = monthlyBuckets.get(key);
      if (bucket) {
        bucket.totalHours += (p.pocet_hodin || 0);
        bucket.totalLaborCost += laborCost;
        bucket.totalOverheadCost += overheadCost; // Accumulate distributed overhead
        bucket.totalCosts += totalItemCost;
      }

      // Worker Stats
      if (p.pracovnik_id && p.pracovnici) {
        if (!monthlyWorkerStats.has(key)) monthlyWorkerStats.set(key, new Map());
        const wMap = monthlyWorkerStats.get(key)!;
        // @ts-ignore
        const wName = Array.isArray(p.pracovnici) ? p.pracovnici[0]?.jmeno : p.pracovnici?.jmeno;
        const currW = wMap.get(p.pracovnik_id) || { name: wName || 'Neznámý', total: 0 };
        currW.total += (p.pocet_hodin || 0);
        wMap.set(p.pracovnik_id, currW);
      }
    }
  }



  // 5. Finalize Monthly Data Array
  // Sort by date key?
  // Keys are YYYY-M. We can sort buckets.
  const sortedKeys = Array.from(monthlyBuckets.keys()).sort((a: string, b: string) => {
    const [y1, m1] = a.split('-').map(Number);
    const [y2, m2] = b.split('-').map(Number);
    if (y1 !== y2) return y1 - y2;
    return m1 - m2;
  });

  const monthlyDataResult: MonthlyData[] = sortedKeys.map(k => {
    const b = monthlyBuckets.get(k)!;
    // Recalc Profit
    b.grossProfit = b.totalRevenue - b.totalCosts;
    // Recalc Overhead for consistency
    // Note: totalCosts includes Labor + Overhead + MaterialCost.
    // MaterialCost = totalMaterialKlient - materialProfit.
    const materialCost = b.totalMaterialCost; // We track it directly now
    // b.totalOverheadCost = b.totalCosts - b.totalLaborCost - materialCost; // REMOVED: Using explicit accumulation now

    // Calculate Monthly KPIs
    b.avgCompanyRate = b.totalHours > 0 ? (b.totalRevenue - b.totalMaterialKlient) / b.totalHours : 0;
    b.averageHourlyWage = b.totalHours > 0 ? b.totalLaborCost / b.totalHours : 0;
    b.averageMonthlyWage = b.totalLaborCost; // For a single month, total labor cost IS the monthly wage total (across all workers)
    // Note: If we wanted average wage PER WORKER, we'd need unique worker count. 
    // But the global KPI `averageMonthlyWage` seems to be Total Labor Cost / 12 (roughly).
    // Let's stick to Total Labor Cost for the month here, as it represents the "Monthly Wage Bill" essentially.
    // Wait, the global KPI is `averageMonthlyWage`. If `AdditionalKpis` expects "Prům. měsíční", it usually means per person or total average?
    // Looking at global calc: `totalLaborCost / (monthlyDataResult.length || 1)`. This is "Average Total Monthly Labor Cost". 
    // So for a single month, it is just `totalLaborCost`.

    b.estimatedVsActualHoursRatio = b.totalEstimatedHours > 0 ? b.totalHours / b.totalEstimatedHours : 0;

    // Process Top Lists for this bucket
    const cMap = monthlyClientStats.get(k);
    if (cMap) {
      b.topClients = Array.from(cMap.entries())
        .sort(([, a]: any, [, b]: any) => b.total - a.total)
        .slice(0, 5)
        .map(([id, d]) => ({ klient_id: id, nazev: d.name, total: d.total }));
    }

    const wMap = monthlyWorkerStats.get(k);
    if (wMap) {
      b.topWorkers = Array.from(wMap.entries())
        .sort(([, a]: any, [, b]: any) => b.total - a.total)
        .slice(0, 5)
        .map(([id, d]) => ({ pracovnik_id: id, jmeno: d.name, total: d.total }));
    }

    return b;
  });

  // 6. Aggregate Totals for Top Cards
  const totalRevenue = monthlyDataResult.reduce((sum, m) => sum + m.totalRevenue, 0);
  const totalCosts = monthlyDataResult.reduce((sum, m) => sum + m.totalCosts, 0);
  const totalHours = monthlyDataResult.reduce((sum, m) => sum + m.totalHours, 0);
  const totalMaterialProfit = monthlyDataResult.reduce((sum, m) => sum + m.materialProfit, 0);
  const totalMaterialKlient = monthlyDataResult.reduce((sum, m) => sum + m.totalMaterialKlient, 0);
  const totalLaborCost = monthlyDataResult.reduce((sum, m) => sum + m.totalLaborCost, 0);
  const totalEstimatedHours = monthlyDataResult.reduce((sum, m) => sum + m.totalEstimatedHours, 0);

  const averageHourlyWage = totalHours > 0 ? totalLaborCost / totalHours : 0;
  const averageMonthlyWage = totalLaborCost / (monthlyDataResult.length || 1); // Approx?
  // Better Avg Month Wage: Unique Workers / Months? 
  // Keep it simple: Labor / 12 (or number of months).

  const estimatedVsActualHoursRatio = totalEstimatedHours > 0 ? totalHours / totalEstimatedHours : 0;

  // 7. Top Clients & Workers (from the aggregated data)
  // We can just iterate the `akceData` and `praceData` we already fetched.
  const clientMap = new Map<number, { name: string, total: number }>();
  for (const a of akceData) {
    if (a.klient_id && a.klienti) {
      // @ts-ignore
      const cName = Array.isArray(a.klienti) ? a.klienti[0]?.nazev : a.klienti?.nazev;
      const curr = clientMap.get(a.klient_id) || { name: cName || 'Neznámý', total: 0 };
      if ((a.project_type || 'STANDARD') === 'STANDARD') {
        curr.total += (a.cena_klient || 0);
      }
      clientMap.set(a.klient_id, curr);
    }
  }

  // Add Finance Revenue (Service/TM) to Top Clients
  for (const f of financeData) {
    const fAction = f.akce;
    if (!fAction || (fAction.project_type || 'STANDARD') === 'STANDARD') continue;

    if (fAction.klient_id) {
      // Check filters? 'financeData' in getDashboardData already respects global date range.
      // Filter logic for client/division was applied to query?
      // Wait, 'financeQuery' above uses explicit filters? No, only date and typ.
      // So we must check filters here.
      if (filters.klientId && fAction.klient_id !== filters.klientId) continue;
      if (filters.divisionId && f.division_id !== filters.divisionId) continue;

      const cName = Array.isArray(fAction.klienti) ? fAction.klienti[0]?.nazev : fAction.klienti?.nazev;
      const curr = clientMap.get(fAction.klient_id) || { name: cName || 'Neznámý', total: 0 };
      curr.total += (Number(f.castka) || 0);
      clientMap.set(fAction.klient_id, curr);
    }
  }

  // Add Accounting Revenue (Mapped) to Top Clients
  if (CompanyConfig.features.enableAccounting && accountingDocs.length > 0) {
    for (const doc of accountingDocs) {
      if (doc.type === 'sales_invoice' && doc.mappings && doc.mappings.length > 0) {
        for (const m of doc.mappings) {
          let matchesFilter = true;
          const linkedAkce = m.akce_id ? akceData.find((a: any) => a.id === m.akce_id) : null;

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
            if (linkedAkce && linkedAkce.klient_id) {
              const cName = Array.isArray(linkedAkce.klienti) ? linkedAkce.klienti[0]?.nazev : linkedAkce.klienti?.nazev;
              const currC = clientMap.get(linkedAkce.klient_id) || { name: cName || 'Neznámý', total: 0 };

              let val = Number(m.amount_czk);
              if (!val) val = Number(m.amount) * (doc.currency === 'EUR' ? 25 : doc.currency === 'USD' ? 23 : 1);

              currC.total += val;
              clientMap.set(linkedAkce.klient_id, currC);
            }
          }
        }
      }
    }
  }
  const topClients = Array.from(clientMap.entries()).sort(([, a], [, b]) => b.total - a.total).slice(0, 5).map(([id, d]) => ({ klient_id: id, nazev: d.name, total: d.total }));

  // Rebuild Action Client Map for global filtering
  const globalActionMap = new Map<number, number>();
  akceData.forEach((a: any) => {
    if (a.klient_id) globalActionMap.set(a.id, a.klient_id);
  });

  const workerMap = new Map<number, { name: string, total: number }>();
  for (const p of filteredPraceData) {

    // Apply Filter if Active
    if (filters.klientId) {
      const matchesDirectly = p.klient_id === filters.klientId;
      const matchesViaAction = p.akce_id && globalActionMap.has(p.akce_id);
      if (!matchesDirectly && !matchesViaAction) continue;
    }
    // Note: p.pracovnik_id filter is implicitly handled if we fetched filtered data? 
    // No, we fetch all workers in some cases? No, worker filter is applied to 'praceQuery' line 117?
    // Let's check: 'praceQuery = praceQuery.eq('pracovnik_id', filters.pracovnikId);' IS STILL THERE.
    // So if filtering by worker, 'praceData' only contains that worker. Safe.

    if (p.pracovnik_id && p.pracovnici) {
      // @ts-ignore
      const wName = Array.isArray(p.pracovnici) ? p.pracovnici[0]?.jmeno : p.pracovnici?.jmeno;
      const curr = workerMap.get(p.pracovnik_id) || { name: wName || 'Neznámý', total: 0 };
      curr.total += (p.pocet_hodin || 0);
      workerMap.set(p.pracovnik_id, curr);
    }
  }
  const topWorkers = Array.from(workerMap.entries()).sort(([, a], [, b]) => b.total - a.total).slice(0, 5).map(([id, d]) => ({ pracovnik_id: id, jmeno: d.name, total: d.total }));


  return {
    totalRevenue,
    totalCosts,
    totalLaborCost,
    totalMaterialCost: monthlyDataResult.reduce((sum, m) => sum + m.totalMaterialCost, 0),
    totalOverheadCost: monthlyDataResult.reduce((sum, m) => sum + m.totalOverheadCost, 0),
    grossProfit: totalRevenue - totalCosts,
    materialProfit: totalMaterialProfit,
    totalHours,
    avgCompanyRate: totalHours > 0 ? (totalRevenue - totalMaterialKlient) / totalHours : 0,
    averageHourlyWage,
    averageMonthlyWage,
    estimatedVsActualHoursRatio,
    totalEstimatedHours,
    topClients,
    topWorkers,
    monthlyData: monthlyDataResult,
    prevPeriod: { totalRevenue: 0, totalCosts: 0, grossProfit: 0 },
  };
}

export interface WorkerStats {
  id: number;
  name: string;
  totalHours: number;
  totalWages: number;
  avgHourlyRate: number;
  realHourlyRate: number;
  projects: { id: number; name: string; projectType: string; clientName: string; hours: number; cost: number; date: string }[];
}


export interface ClientStats {
  id: number;
  name: string;
  revenue: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  profit: number;
  margin: number;
  totalHours: number;
  actions: ActionStats[];
}

export interface ActionStats {
  id: number;
  name: string;
  projectType: string;
  revenue: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  profit: number;
  margin: number;
  totalHours: number;
  isCompleted: boolean;
  date: string;
  clientName: string;
  materialProfit: number;
  workers: { name: string; hours: number; cost: number; }[];
  activeMonths: string[]; // YYYY-M format
}

export async function getDetailedStats(
  period: 'last12months' | { year: number; month?: number },
  filters: { pracovnikId?: number | null, klientId?: number | null, divisionId?: number | null } = {},
  customClient?: any
) {
  const client = customClient || supabase;

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === 'last12months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const limitDate = new Date(APP_START_YEAR, 0, 1);
    if (startDate < limitDate) {
      startDate = limitDate;
    }
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    const year = period.year;
    if (period.month !== undefined && period.month !== null) {
      startDate = new Date(year, period.month, 1);
      endDate = new Date(year, period.month + 1, 0);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    }
  }

  endDate.setHours(23, 59, 59, 999);
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  // Prepare queries
  // Prepare queries (Logs)
  let praceQuery = client.from('prace').select('*').gte('datum', start).lte('datum', end);
  let fixedCostsQuery = client.from('fixed_costs').select('*').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear());
  const financeQuery = client.from('finance').select('id, datum, castka, akce_id, typ, division_id, akce:akce_id(klient_id, project_type, klienti(nazev))').eq('typ', 'Příjem').gte('datum', start).lte('datum', end).not('akce_id', 'is', null);

  // Accounting Query
  let accountingQuery = Promise.resolve({ data: [] });
  if (CompanyConfig.features.enableAccounting) {
    // @ts-ignore
    accountingQuery = client.from('accounting_documents')
      .select('id, type, amount, issue_date, mappings:accounting_mappings(id, akce_id, pracovnik_id, cost_category, amount)')
      .gte('issue_date', start)
      .lte('issue_date', end);
  }

  // Global Context Query
  const globalHoursQuery = client.from('prace').select('id, datum, pocet_hodin, pracovnik_id').gte('datum', start).lte('datum', end);

  // Apply Filters to Primary Log Queries
  if (filters.pracovnikId) {
    praceQuery = praceQuery.eq('pracovnik_id', filters.pracovnikId);
  }
  if (filters.divisionId) {
    fixedCostsQuery = fixedCostsQuery.or(`division_id.is.null,division_id.eq.${filters.divisionId}`);
  }

  const [workersRes, clientsRes, praceRes, mzdyRes, fixedCostsRes, globalHoursRes, financeRes, accountingQueryRes] = await Promise.all([
    client.from('pracovnici').select('*'),
    client.from('klienti').select('*'),
    praceQuery,
    client.from('mzdy').select('*').gte('rok', startDate.getFullYear() - 1).lte('rok', endDate.getFullYear() + 1),
    fixedCostsQuery,
    globalHoursQuery,
    financeQuery,
    accountingQuery
  ]);

  const workers = workersRes.data || [];
  const clients = clientsRes.data || [];
  const prace = praceRes.data || [];
  const mzdy = mzdyRes.data || [];
  const fixedCosts = fixedCostsRes?.data || [];
  const globalPrace = globalHoursRes.data || [];
  // @ts-ignore
  const financeData = (financeRes?.data || []) as any[];
  // @ts-ignore
  const accountingDocs = (accountingQueryRes?.data || []) as any[];

  // --- PRE-PROCESS: Mapped Labor Costs ---
  const workerMonthlyMappedLabor = new Map<string, number>();
  if (CompanyConfig.features.enableAccounting && accountingDocs.length > 0) {
    for (const doc of accountingDocs) {
      if (doc.mappings && doc.mappings.length > 0) {
        const d = new Date(doc.issue_date);
        const keySuffix = `${d.getFullYear()}-${d.getMonth()}`; // 0-indexed month for consistency

        for (const m of doc.mappings) {
          if (m.pracovnik_id) {
            const key = `${m.pracovnik_id}-${keySuffix}`;
            workerMonthlyMappedLabor.set(key, (workerMonthlyMappedLabor.get(key) || 0) + (Number(m.amount) || 0));
          }
        }
      }
    }
  }

  // --- Fetch Actions (Created OR Active) ---
  const activeActionIds = new Set<number>();
  prace.forEach((p: any) => { if (p.akce_id) activeActionIds.add(p.akce_id); });
  financeData.forEach((f: any) => { if (f.akce_id) activeActionIds.add(f.akce_id); });
  accountingDocs.forEach((doc: any) => {
    if (doc.mappings) {
      doc.mappings.forEach((m: any) => { if (m.akce_id) activeActionIds.add(m.akce_id); });
    }
  });

  let akceCreatedQuery = client.from('akce').select('*, klienti(nazev)').gte('datum', start).lte('datum', end);
  let akceActiveQuery = client.from('akce').select('*, klienti(nazev)');

  if (activeActionIds.size > 0) {
    akceActiveQuery = akceActiveQuery.in('id', Array.from(activeActionIds));
  } else {
    akceActiveQuery = akceActiveQuery.eq('id', -1); // Return empty if no active IDs
  }

  // Apply Action Filters
  if (filters.klientId) {
    akceCreatedQuery = akceCreatedQuery.eq('klient_id', filters.klientId);
    akceActiveQuery = akceActiveQuery.eq('klient_id', filters.klientId);
  }
  if (filters.divisionId) {
    akceCreatedQuery = akceCreatedQuery.eq('division_id', filters.divisionId);
    akceActiveQuery = akceActiveQuery.eq('division_id', filters.divisionId);
  }

  const [akceCreatedRes, akceActiveRes] = await Promise.all([
    akceCreatedQuery,
    akceActiveQuery
  ]);

  // Merge and Deduplicate Actions
  const akceMap = new Map<number, any>();
  (akceCreatedRes.data || []).forEach((a: any) => akceMap.set(a.id, a));
  (akceActiveRes.data || []).forEach((a: any) => akceMap.set(a.id, a));

  const akce = Array.from(akceMap.values());

  // 1. Build Map: Worker ID -> Base Hourly Rate
  const workerBaseRateMap = new Map<number, number>();
  workers.forEach((w: any) => {
    workerBaseRateMap.set(w.id, Number(w.hodinova_mzda) || 0);
  });

  // 2. Build Map: Action ID -> Client ID
  const actionClientMap = new Map<number, number>();
  const validAkceIds = new Set<number>();
  akce.forEach(a => {
    validAkceIds.add(a.id);
    if (a.klient_id) {
      actionClientMap.set(a.id, a.klient_id);
    }
  });

  // 2b. Build Accounting Map: Action ID -> { revenue, cost, materialCost }
  const accountingActionMap = new Map<number, { revenue: number, cost: number, materialCost: number }>();
  if (accountingDocs.length > 0) {
    accountingDocs.forEach((doc: any) => {
      if (doc.mappings && doc.mappings.length > 0) {
        doc.mappings.forEach((m: any) => {
          if (m.akce_id) {
            // SKIP LABOR: If mapped to a worker, it counts as Labor Cost (allocated via rate), not direct Action Cost.
            if (m.pracovnik_id) return;

            const curr = accountingActionMap.get(m.akce_id) || { revenue: 0, cost: 0, materialCost: 0 };
            const amt = Number(m.amount) || 0;
            if (doc.type === 'sales_invoice') {
              curr.revenue += amt;
            } else if (doc.type === 'purchase_invoice') {
              curr.cost += amt;
              if (m.cost_category === 'material') {
                curr.materialCost += amt;
              }
            }
            accountingActionMap.set(m.akce_id, curr);
          }
        });
      }
    });
  }

  // In-Memory Filter for Client & Division on 'prace'
  let filteredPrace = prace;

  if (filters.klientId) {
    filteredPrace = filteredPrace.filter((p: any) => {
      const direct = p.klient_id === filters.klientId;
      const viaAction = p.akce_id && actionClientMap.get(p.akce_id) === filters.klientId;
      return direct || viaAction;
    });
  }

  if (filters.divisionId) {
    filteredPrace = filteredPrace.filter((p: any) => {
      return p.division_id === filters.divisionId || (p.akce_id && validAkceIds.has(p.akce_id));
    });
  }

  // --- Overhead Rates Calculation (Robust) ---
  const monthlyOverheadRate = new Map<string, number>();

  // A. Prepare Costs
  const monthlyGlobalCosts = new Map<string, number>();
  const monthlySpecificCosts = new Map<string, number>();

  fixedCosts.forEach((fc: any) => {
    const key = `${fc.rok}-${fc.mesic}`;
    const amount = Number(fc.castka) || 0;
    if (fc.division_id) {
      monthlySpecificCosts.set(key, (monthlySpecificCosts.get(key) || 0) + amount);
    } else {
      monthlyGlobalCosts.set(key, (monthlyGlobalCosts.get(key) || 0) + amount);
    }
  });

  // B. Prepare Hours (Denominator)
  // Global Hours: use `globalPrace` (Contains ALL hours for the period)
  const monthlyGlobalHours = new Map<string, number>();
  globalPrace.forEach((p: any) => {
    const d = new Date(p.datum);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthlyGlobalHours.set(key, (monthlyGlobalHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
  });

  const monthlyDivisionHours = new Map<string, number>();
  if (filters.divisionId && !filters.pracovnikId) {
    // We trust filteredPrace contains all division hours
    filteredPrace.forEach((p: any) => {
      const d = new Date(p.datum);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthlyDivisionHours.set(key, (monthlyDivisionHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
    });
  }

  // C. Compute Rates
  const allRateKeys = new Set([...monthlyGlobalCosts.keys(), ...monthlySpecificCosts.keys(), ...monthlyGlobalHours.keys()]);
  allRateKeys.forEach((key: string) => {
    let rate = 0;

    // 1. Global Rate
    const gCost = monthlyGlobalCosts.get(key) || 0;
    const gHours = monthlyGlobalHours.get(key) || 0;
    if (gHours > 0) rate += (gCost / gHours);

    // 2. Specific Rate
    if (filters.divisionId) {
      const sCost = monthlySpecificCosts.get(key) || 0;
      const dHours = monthlyDivisionHours.get(key) || 0;
      if (dHours > 0) rate += (sCost / dHours);
    }

    monthlyOverheadRate.set(key, rate);
  });

  // 3. Rate Maps & Worker Calculations from GLOBAL Context (globalPrace)
  const workerRealMonthlyRates = new Map<string, number>();
  const workerMonthHours = new Map<string, number>();

  // Use globalPrace to get 'Worker Total Hours' for correct wage rate allocation
  globalPrace.forEach((p: any) => {
    if (p.pracovnik_id) {
      const d = new Date(p.datum);
      const key = `${p.pracovnik_id}-${d.getFullYear()}-${d.getMonth() + 1}`;
      workerMonthHours.set(key, (workerMonthHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
    }
  });

  // Calculate Rates (Mzdy + Mapped Labor)
  const workerMonthTotalCost = new Map<string, number>();

  // 1. From Mzdy
  mzdy.forEach((m: any) => {
    const key = `${m.pracovnik_id}-${m.rok}-${m.mesic}`;
    workerMonthTotalCost.set(key, (workerMonthTotalCost.get(key) || 0) + (Number(m.celkova_castka) || 0));
  });
  // 2. From Mapped Labor
  workerMonthlyMappedLabor.forEach((amount: number, key: string) => {
    workerMonthTotalCost.set(key, (workerMonthTotalCost.get(key) || 0) + amount);
  });

  workerMonthTotalCost.forEach((totalCost, key) => {
    const hours = workerMonthHours.get(key) || 0;
    const parts = key.split('-');
    const pId = parseInt(parts[0]);

    if (hours > 0) {
      let calculatedRate = totalCost / hours;
      const baseRate = workerBaseRateMap.get(pId) || 0;
      if (baseRate > 0 && calculatedRate > (baseRate * 1.5)) {
        calculatedRate = baseRate;
      }
      workerRealMonthlyRates.set(key, calculatedRate);
    }
  });

  // 4. Aggregate Costs per Client / Action
  const clientLaborCosts = new Map<number, number>();
  const clientOverheadCosts = new Map<number, number>();
  const clientHours = new Map<number, number>();
  const actionLaborCosts = new Map<number, number>();
  const actionOverheadCosts = new Map<number, number>();
  const actionHours = new Map<number, number>();
  const actionWorkerMap = new Map<number, Map<number, { hours: number, cost: number }>>();
  const workerProjectsMap = new Map<number, Map<number, { hours: number, cost: number }>>(); // WorkerID -> ActionID -> Stats

  const workerAggregates = new Map<number, { id: number, name: string, hours: number, cost: number }>();

  filteredPrace.forEach((p: any) => {
    let clientId = p.klient_id;
    if (!clientId && p.akce_id) {
      clientId = actionClientMap.get(p.akce_id);
    }
    if (!clientId) return;

    const d = new Date(p.datum);
    const hours = Number(p.pocet_hodin) || 0;

    // Labor Cost
    const rateKey = `${p.pracovnik_id}-${d.getFullYear()}-${d.getMonth() + 1}`;
    let rate = workerRealMonthlyRates.get(rateKey);
    if (rate === undefined || rate === null) {
      rate = workerBaseRateMap.get(p.pracovnik_id);
    }
    if (!rate) rate = 0;
    const laborCost = hours * rate;

    // Overhead Cost
    const overheadKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const overheadRate = Number(monthlyOverheadRate.get(overheadKey)) || 0;
    const safeHours = Number(hours) || 0;
    const overheadCost = safeHours * overheadRate;

    // Track worker cost per action for Detail View
    if (p.akce_id && p.pracovnik_id) {
      if (!actionWorkerMap.has(p.akce_id)) {
        actionWorkerMap.set(p.akce_id, new Map());
      }
      const awMap = actionWorkerMap.get(p.akce_id)!;
      const currAW = awMap.get(p.pracovnik_id) || { hours: 0, cost: 0 };
      currAW.hours += hours;
      currAW.cost += laborCost; // Allocated cost
      awMap.set(p.pracovnik_id, currAW);

      // Track projects per worker for Detail View
      if (!workerProjectsMap.has(p.pracovnik_id)) {
        workerProjectsMap.set(p.pracovnik_id, new Map());
      }
      const wpMap = workerProjectsMap.get(p.pracovnik_id)!;
      const currWP = wpMap.get(p.akce_id) || { hours: 0, cost: 0 };
      currWP.hours += hours;
      currWP.cost += laborCost;
      wpMap.set(p.akce_id, currWP);
    }

    clientLaborCosts.set(clientId, (clientLaborCosts.get(clientId) || 0) + laborCost);
    clientOverheadCosts.set(clientId, (clientOverheadCosts.get(clientId) || 0) + overheadCost);
    clientHours.set(clientId, (clientHours.get(clientId) || 0) + hours);

    if (p.akce_id) {
      actionLaborCosts.set(p.akce_id, (actionLaborCosts.get(p.akce_id) || 0) + laborCost);
      actionOverheadCosts.set(p.akce_id, (actionOverheadCosts.get(p.akce_id) || 0) + overheadCost);
      actionHours.set(p.akce_id, (actionHours.get(p.akce_id) || 0) + hours);
    }

    if (p.pracovnik_id) {
      const curr = workerAggregates.get(p.pracovnik_id) || { id: p.pracovnik_id, name: 'Unknown', hours: 0, cost: 0 };
      curr.hours += hours;
      curr.cost += laborCost;
      workerAggregates.set(p.pracovnik_id, curr);
    }
  });

  const finalWorkerStats: WorkerStats[] = Array.from(workerAggregates.values()).map((w: any) => {
    const workerInfo = workers.find((wk: any) => wk.id === w.id);

    // Calculate Real Hourly Rate (Pure: Total Wages Paid / Total Global Hours Worked)
    // We need to fetch global totals for this worker from the initial queries, regardless of current filters
    // Fortunately, we have 'mzdy' (all wages in range) and 'globalHoursQuery' (all hours in range)

    // 1. Total Wages for this worker in the period
    let workerWages = 0;
    workerMonthTotalCost.forEach((cost, key) => {
      if (key.startsWith(`${w.id}-`)) {
        // Filter by date range (since mzdy/costs might be wider)
        const parts = key.split('-');
        const year = parseInt(parts[1]);
        const month = parseInt(parts[2]);
        const d = new Date(year, month, 1);
        if (d >= startDate && d <= endDate) {
          workerWages += cost;
        }
      }
    });

    // 2. Total Global Hours for this worker in the period
    // We need to aggregate from globalHoursRes (which we fetched for overhead calc, but it contains all hours)
    const workerGlobalHours = (globalHoursRes.data || [])
      .filter((gh: any) => gh.pracovnik_id === w.id)
      .reduce((sum: number, gh: any) => sum + (Number(gh.pocet_hodin) || 0), 0);

    // 3. Real Rate
    const realHourlyRate = workerGlobalHours > 0 ? (workerWages / workerGlobalHours) : 0;

    // 4. Projects History
    const workerProjects: { id: number; name: string; projectType: string; clientName: string; hours: number; cost: number; date: string }[] = [];
    const wpMap = workerProjectsMap.get(w.id);
    if (wpMap) {
      wpMap.forEach((stats, actionId) => {
        const action = akce.find(a => a.id === actionId);
        if (action) {
          // Find client name
          let clientName = 'Neznámý';
          if (action.klient_id) {
            const client = clients.find((c: any) => c.id === action.klient_id);
            if (client) clientName = client.nazev;
          }

          workerProjects.push({
            id: actionId,
            name: action.nazev,
            projectType: action.project_type || 'STANDARD',
            clientName: clientName,
            hours: stats.hours,
            cost: stats.cost,
            date: action.datum
          });
        }
      });
    }
    workerProjects.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      id: w.id,
      name: workerInfo?.jmeno || 'Neznámý',
      totalHours: w.hours,
      totalWages: workerWages, // CHANGED: Use actual global wages (or wages in period) instead of allocated cost
      avgHourlyRate: w.hours > 0 ? w.cost / w.hours : 0, // This is "Allocated Rate" (Allocated Cost / Hours)
      realHourlyRate: realHourlyRate, // This is "Real Payment Rate"
      projects: workerProjects
    };
  }).sort((a, b) => b.totalHours - a.totalHours);

  // 5. Pre-calculate Activity Months per Action
  const actionActivityMap = new Map<number, Set<string>>();

  prace.forEach((p: any) => {
    if (p.akce_id) {
      if (!actionActivityMap.has(p.akce_id)) actionActivityMap.set(p.akce_id, new Set());
      const d = new Date(p.datum);
      actionActivityMap.get(p.akce_id)!.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
  });

  financeData.forEach((f: any) => {
    if (f.akce_id) {
      if (!actionActivityMap.has(f.akce_id)) actionActivityMap.set(f.akce_id, new Set());
      const d = new Date(f.datum);
      actionActivityMap.get(f.akce_id)!.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
  });

  accountingDocs.forEach((doc: any) => {
    if (doc.mappings) {
      doc.mappings.forEach((m: any) => {
        if (m.akce_id) {
          if (!actionActivityMap.has(m.akce_id)) actionActivityMap.set(m.akce_id, new Set());
          const d = new Date(doc.issue_date);
          actionActivityMap.get(m.akce_id)!.add(`${d.getFullYear()}-${d.getMonth()}`);
        }
      });
    }
  });

  const clientStats: ClientStats[] = clients.map((c: any) => {
    const cAkce = akce.filter((a: any) => a.klient_id === c.id);

    // 1. Calculate Actions First
    const actions: ActionStats[] = cAkce.map((a: any) => {
      let aRevenue = 0;
      const actionDate = new Date(a.datum);
      const periodStart = new Date(start);
      const periodEnd = new Date(end);
      const isCreatedInPeriod = actionDate >= periodStart && actionDate <= periodEnd;

      if ((a.project_type || 'STANDARD') === 'STANDARD') {
        if (isCreatedInPeriod) {
          aRevenue = Number(a.cena_klient) || 0;
        }
      } else {
        // For Service/TM, revenue is sum of linked finance records
        // financeData is available in scope
        const aFinance = financeData.filter((f: any) => f.akce_id === a.id);
        aRevenue = aFinance.reduce((sum: number, f: any) => sum + (Number(f.castka) || 0), 0);
      }

      // Add Mapped Accounting Revenue
      const accStats = accountingActionMap.get(a.id);
      if (accStats) {
        aRevenue += accStats.revenue;
      }

      let aMaterialCost = (accStats?.materialCost || 0);
      if (isCreatedInPeriod) {
        aMaterialCost += (Number(a.material_my) || 0);
      }

      let aMaterialRevenue = 0;
      if (isCreatedInPeriod) {
        aMaterialRevenue = Number(a.material_klient) || 0;
      }
      const aLaborCost = actionLaborCosts.get(a.id) || 0;
      const aOverheadCost = actionOverheadCosts.get(a.id) || 0;
      const aTotalCost = aMaterialCost + aLaborCost + aOverheadCost + (accStats?.cost ? (accStats.cost - accStats.materialCost) : 0);

      const aProfit = aRevenue - aTotalCost;
      const aMargin = aRevenue > 0 ? ((aRevenue - aTotalCost) / aRevenue) * 100 : 0;

      // Get workers for this action
      const actionWorkers = [];
      const awMap = actionWorkerMap.get(a.id);
      if (awMap) {
        for (const [wId, stats] of awMap.entries()) {
          const wInfo = workers.find((w: any) => w.id === wId);
          actionWorkers.push({
            name: wInfo?.jmeno || 'Neznámý',
            hours: stats.hours,
            cost: stats.cost
          });
        }
      }
      actionWorkers.sort((wa: any, wb: any) => wb.hours - wa.hours);

      const am = actionActivityMap.get(a.id) || new Set();
      const ad = new Date(a.datum);
      am.add(`${ad.getFullYear()}-${ad.getMonth()}`);

      return {
        activeMonths: Array.from(am),
        id: a.id,
        name: a.nazev,
        projectType: a.project_type || 'STANDARD',
        revenue: aRevenue,
        materialCost: aMaterialCost,
        materialRevenue: aMaterialRevenue,
        materialProfit: aMaterialRevenue - aMaterialCost,
        laborCost: aLaborCost,
        totalCost: aTotalCost,
        overheadCost: aOverheadCost,
        profit: aProfit,
        margin: aMargin,
        totalHours: actionHours.get(a.id) || 0,
        isCompleted: a.is_completed,
        date: a.datum,
        clientName: c.nazev,
        workers: actionWorkers
      };
    }).sort((a: any, b: any) => b.revenue - a.revenue);

    // 2. Aggregate Client Totals from Actions
    // For Revenue and MaterialCost, we trust the Action calculation (which handles T&M, Mappings, etc.)
    const revenue = actions.reduce((sum, a) => sum + a.revenue, 0);
    const materialCost = actions.reduce((sum, a) => sum + a.materialCost, 0);

    // For Labor and Overhead, use Client Maps to include "orphaned" logs
    const laborCost = clientLaborCosts.get(c.id) || 0;
    const overheadCost = clientOverheadCosts.get(c.id) || 0;

    // Note: totalCost might slightly mismatched from sum(actions.totalCost) if there are orphans.
    const totalCost = materialCost + laborCost + overheadCost;

    if (revenue === 0 && totalCost === 0 && cAkce.length === 0) return null;

    return {
      id: c.id,
      name: c.nazev,
      revenue,
      materialCost,
      laborCost,
      overheadCost,
      totalCost,
      profit: revenue - totalCost,
      margin: revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0,
      totalHours: clientHours.get(c.id) || 0,
      actions
    };
  })
    .filter((c: ClientStats | null): c is ClientStats => c !== null)
    .sort((a: any, b: any) => b.revenue - a.revenue);

  return { workers: finalWorkerStats, clients: clientStats };
}

export interface ProjectHealthStats {
  id: number;
  name: string;
  clientName: string;
  totalEstimatedHours: number;
  totalActualHours: number;
  budgetUsage: number; // 0-1 (e.g. 0.8 for 80%)
  wipValue: number; // Cost based value of work done
  laborCost: number; // NEW
  materialCost: number; // NEW
  revenuePotential: number; // If fixed price: price * % completion (or just price if we assume full payment). Let's use Proportional.
  status: 'ok' | 'warning' | 'critical';
  lastActivity: string | null;
  projectType: string;
}

export interface ExperimentalStats {
  activeProjects: ProjectHealthStats[];
  totalWipValue: number; // Total cost invested in active projects
  totalRevenuePotential: number; // Total projected revenue from active projects
  projectsAtRisk: number; // Count of projects over budget or close to it
}

export async function getExperimentalStats(filters: { divisionId?: number | null } = {}): Promise<ExperimentalStats> {
  // 1. Fetch ALL uncompleted actions (Active Projects)
  let query = supabase
    .from('akce')
    .select('*, klienti(nazev)')
    .eq('is_completed', false)
    .order('created_at', { ascending: false });

  if (filters.divisionId) {
    query = query.eq('division_id', filters.divisionId);
  }

  const { data: activeActions } = await query;

  if (!activeActions || activeActions.length === 0) {
    return {
      activeProjects: [],
      totalWipValue: 0,
      totalRevenuePotential: 0,
      projectsAtRisk: 0
    };
  }

  // 2. Fetch ALL work logs for these actions
  // We need to fetch 'prace' that are linked to these actions
  const actionIds = activeActions.map((a: any) => a.id);
  const { data: workLogs } = await supabase
    .from('prace')
    .select('akce_id, pocet_hodin, datum, pracovnik_id')
    .in('akce_id', actionIds);

  // 3. Fetch Workers to get base rates for cost calculation
  // (We could optimize this by fetching only relevant workers, but for now simple is fine)
  const { data: workers } = await supabase.from('pracovnici').select('id, hodinova_mzda');
  const workerRateMap = new Map<number, number>();
  workers?.forEach((w: any) => workerRateMap.set(w.id, Number(w.hodinova_mzda) || 0));

  // 3b. Fetch Finance (Revenues) for these actions (for Service/TM projects)
  // We fetch finance records for proper Revenue Potential calculation
  const { data: financeLogs } = await supabase
    .from('finance')
    .select('akce_id, castka')
    .eq('typ', 'Příjem')
    .in('akce_id', actionIds);

  // 4. Aggregate data per project
  const projectStats: ProjectHealthStats[] = activeActions.map((action: any) => {
    const projectLogs = workLogs?.filter((log: any) => log.akce_id === action.id) || [];

    let totalActualHours = 0;
    let laborCost = 0;
    let lastActivityDate: Date | null = null;

    projectLogs.forEach((log: any) => {
      const hours = Number(log.pocet_hodin) || 0;
      totalActualHours += hours;
      const rate = workerRateMap.get(log.pracovnik_id || 0) || 0;
      laborCost += hours * rate;

      if (log.datum) {
        const d = new Date(log.datum);
        if (!lastActivityDate || d > lastActivityDate) {
          lastActivityDate = d;
        }
      }
    });

    const totalEstimated = Number(action.odhad_hodin) || 0;
    const materialCost = Number(action.material_my) || 0;
    const totalCost = laborCost + materialCost; // This is WIP Value (Cost based)

    // Budget Usage Logic
    const budgetUsage = totalEstimated > 0 ? totalActualHours / totalEstimated : 0;

    // Revenue Potential Calculation
    let revenuePotential = 0;
    const pType = action.project_type || 'STANDARD';

    if (pType === 'STANDARD') {
      // Fixed Price
      revenuePotential = Number(action.cena_klient) || 0;
    } else {
      // Service/TM: Sum value of invoices (Realized Revenue as proxy for Potential/Scope)
      // Using 'financeLogs' fetched earlier
      const pFinance = financeLogs?.filter((f: any) => f.akce_id === action.id) || [];
      revenuePotential = pFinance.reduce((sum: number, f: any) => sum + (Number(f.castka) || 0), 0);
    }

    // Status Logic
    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (budgetUsage > 1.1) status = 'critical';
    else if (budgetUsage > 0.85) status = 'warning';

    return {
      id: action.id,
      name: action.nazev,
      clientName: Array.isArray(action.klienti) ? action.klienti[0]?.nazev : action.klienti?.nazev || 'Neznámý',
      totalEstimatedHours: totalEstimated,
      totalActualHours,
      budgetUsage,
      wipValue: totalCost,
      laborCost,
      materialCost,
      revenuePotential,
      status,
      lastActivity: lastActivityDate ? (lastActivityDate as Date).toISOString().split('T')[0] : null,
      projectType: pType
    };
  });

  // Calculate global stats
  const totalWipValue = projectStats.reduce((sum: number, p: any) => sum + p.wipValue, 0);
  const totalRevenuePotential = projectStats.reduce((sum: number, p: any) => sum + p.revenuePotential, 0);
  const projectsAtRisk = projectStats.filter((p: any) => p.status === 'critical' || p.status === 'warning').length;

  return {
    activeProjects: projectStats.sort((a: any, b: any) => b.budgetUsage - a.budgetUsage), // Sort by risk (highest usage first)
    totalWipValue,
    totalRevenuePotential,
    projectsAtRisk
  };
}