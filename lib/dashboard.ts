import { supabase } from '@/lib/supabase';
import { APP_START_YEAR } from '@/lib/config';

export interface MonthlyData {
  month: string;
  year: number;
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  totalHours: number;
  materialProfit: number;
  totalMaterialKlient: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalMaterialCost: number;
  totalEstimatedHours: number;
  // KPI fields for detailed view
  avgCompanyRate: number;
  averageHourlyWage: number;
  averageMonthlyWage: number;
  estimatedVsActualHoursRatio: number;
  topClients: { klient_id: number; nazev: string; total: number }[];
  topWorkers: { pracovnik_id: number; jmeno: string; total: number }[];
}

export interface DashboardData {
  totalRevenue: number;
  totalCosts: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalMaterialCost: number;
  grossProfit: number;
  materialProfit: number;
  totalHours: number;
  totalEstimatedHours: number;
  avgCompanyRate: number;
  averageHourlyWage: number;
  averageMonthlyWage: number;
  estimatedVsActualHoursRatio: number;
  topClients: { klient_id: number; nazev: string; total: number }[];
  topWorkers: { pracovnik_id: number; jmeno: string; total: number }[];

  monthlyData: MonthlyData[];

  prevPeriod: {
    totalRevenue: number;
    totalCosts: number;
    grossProfit: number;
  }
}

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
  filters: { pracovnikId?: number | null, klientId?: number | null, divisionId?: number | null }
): Promise<DashboardData> {

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

  // 2. Prepare Queries (Bulk Fetch)
  let akceQuery = supabase.from('akce').select('id, datum, cena_klient, material_my, material_klient, odhad_hodin, klient_id, division_id, klienti(nazev)').gte('datum', start).lte('datum', end);
  let praceQuery = supabase.from('prace').select('id, datum, pocet_hodin, pracovnik_id, klient_id, akce_id, division_id, pracovnici(jmeno)').gte('datum', start).lte('datum', end);

  // Mzdy needs a slightly wider range to be safe or just matching years. Always GLOBAL for rate calc.
  let mzdyQuery = supabase.from('mzdy').select('rok, mesic, celkova_castka, pracovnik_id').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear());

  let fixedCostsQuery = supabase.from('fixed_costs').select('rok, mesic, castka, division_id').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear());

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
  const [akceRes, praceRes, mzdyRes, fixedCostsRes, workersRes, allPraceRes] = await Promise.all([
    akceQuery,
    praceQuery,
    mzdyQuery,
    fixedCostsQuery,
    supabase.from('pracovnici').select('id, hodinova_mzda'),
    // If filtering by division/client, we need GLOBAL hours to calculate correct overhead/worker rates
    (filters.divisionId || filters.klientId)
      ? supabase.from('prace').select('id, datum, pocet_hodin, pracovnik_id').gte('datum', start).lte('datum', end)
      : Promise.resolve({ data: null })
  ]);

  const akceData = akceRes.data || [];
  const praceData = praceRes.data || []; // Filtered data
  const mzdyData = mzdyRes.data || [];
  const fixedCostsData = fixedCostsRes.data || [];
  const workersData = workersRes.data || [];

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
    let curr = new Date(startDate);
    while (curr <= endDate) {
      const key = getMonthKey(curr);
      if (!monthlyBuckets.has(key)) {
        monthlyBuckets.set(key, createEmptyMonthlyData(curr));
        monthlyClientStats.set(key, new Map());
        monthlyWorkerStats.set(key, new Map());
      }
      curr.setMonth(curr.getMonth() + 1);
    }
  } else if (typeof period === 'object' && period.year && period.month === undefined) {
    for (let m = 0; m < 12; m++) {
      const d = new Date(period.year, m, 1);
      const key = getMonthKey(d);
      if (!monthlyBuckets.has(key)) {
        monthlyBuckets.set(key, createEmptyMonthlyData(d));
        monthlyClientStats.set(key, new Map());
        monthlyWorkerStats.set(key, new Map());
      }
    }
  }

  // A. Process Akce (Revenue, Material)
  for (const a of akceData) {
    const d = new Date(a.datum);
    const key = getMonthKey(d);

    if (!monthlyBuckets.has(key) && !isLast12Months) {
      monthlyBuckets.set(key, createEmptyMonthlyData(d));
      monthlyClientStats.set(key, new Map());
      monthlyWorkerStats.set(key, new Map());
    }

    const bucket = monthlyBuckets.get(key);
    if (bucket) {
      bucket.totalRevenue += (a.cena_klient || 0);
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
      currC.total += (a.cena_klient || 0);
      cMap.set(a.klient_id, currC);
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

  const workerMonthRate = new Map<string, number>();
  for (const m of mzdyData) {
    const key = `${m.pracovnik_id}-${m.rok}-${m.mesic - 1}`;
    const hours = workerMonthHours.get(key) || 0;
    if (hours > 0) {
      let calculatedRate = (m.celkova_castka || 0) / hours;
      const baseRate = workerBaseRateMap.get(m.pracovnik_id) || 0;
      if (baseRate > 0 && calculatedRate > (baseRate * 1.5)) {
        calculatedRate = baseRate;
      }
      workerMonthRate.set(key, calculatedRate);
    }
  }

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

  fixedCostsData.forEach((fc: any) => {
    const key = `${fc.rok}-${fc.mesic - 1}`;
    const amount = Number(fc.castka) || 0;
    if (fc.division_id) {
      // Specific
      // Verify it matches filter (if filter active). query used OR, so we might have others if no filter? 
      // If filter is active, query ensures we only get null or filterId.
      totalSpecificFixedCosts += amount;
      monthlySpecificFixedCosts.set(key, (monthlySpecificFixedCosts.get(key) || 0) + amount);
    } else {
      // Global
      totalGlobalFixedCosts += amount;
      monthlyGlobalFixedCosts.set(key, (monthlyGlobalFixedCosts.get(key) || 0) + amount);
    }
  });

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
  const useFilterMode = !!(filters.klientId || filters.divisionId);

  if (!useFilterMode) {
    // Simple Mode: Sum Mzdy
    for (const m of mzdyData) {
      const d = new Date(m.rok, m.mesic - 1, 1);
      const key = getMonthKey(d);
      if (!monthlyBuckets.has(key) && !isLast12Months) {
        monthlyBuckets.set(key, createEmptyMonthlyData(d));
        monthlyClientStats.set(key, new Map());
        monthlyWorkerStats.set(key, new Map());
      }
      const bucket = monthlyBuckets.get(key);
      if (bucket) {
        let laborCost = (m.celkova_castka || 0);
        // Fallback checks
        const rateKey = `${m.pracovnik_id}-${m.rok}-${m.mesic - 1}`;
        const hours = workerMonthHours.get(rateKey) || 0;
        if (hours > 0) {
          const calculatedRate = laborCost / hours;
          const baseRate = workerBaseRateMap.get(m.pracovnik_id) || 0;
          if (baseRate > 0 && calculatedRate > (baseRate * 1.5)) {
            laborCost = hours * baseRate;
          }
        }
        bucket.totalLaborCost += laborCost;
        bucket.totalCosts += laborCost;
      }
    }
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

  // C. Fixed Costs - Add explicit costs if they exist directly?
  // If Filter Mode (Division or Client), we calculated Overhead Rate based on filtered fixed costs and applied it to hours.
  // So we do NOT add lump sum FixedCosts again in Filter Mode.

  if (!useFilterMode) {
    for (const fc of fixedCostsData) {
      const d = new Date(fc.rok, fc.mesic - 1, 1);
      const key = getMonthKey(d);
      const bucket = monthlyBuckets.get(key);
      if (bucket) {
        bucket.totalCosts += (Number(fc.castka) || 0);
      }
    }
  }

  // 5. Finalize Monthly Data Array
  // Sort by date key?
  // Keys are YYYY-M. We can sort buckets.
  const sortedKeys = Array.from(monthlyBuckets.keys()).sort((a, b) => {
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
    b.totalOverheadCost = b.totalCosts - b.totalLaborCost - materialCost;

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
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 5)
        .map(([id, d]) => ({ klient_id: id, nazev: d.name, total: d.total }));
    }

    const wMap = monthlyWorkerStats.get(k);
    if (wMap) {
      b.topWorkers = Array.from(wMap.entries())
        .sort(([, a], [, b]) => b.total - a.total)
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
      curr.total += (a.cena_klient || 0);
      clientMap.set(a.klient_id, curr);
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
    totalOverheadCost: totalCosts - totalLaborCost - (monthlyDataResult.reduce((sum, m) => sum + m.totalMaterialCost, 0)),
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
}

export interface ClientStats {
  id: number;
  name: string;
  revenue: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number; // NEW
  totalCost: number;
  profit: number;
  margin: number;
  totalHours: number;
  actions: ActionStats[];
}

export interface ActionStats {
  id: number;
  name: string;
  revenue: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number; // NEW
  totalCost: number;
  profit: number;
  margin: number;
  totalHours: number;
  isCompleted: boolean;
}

export async function getDetailedStats(
  period: 'last12months' | { year: number; month?: number },
  filters: { pracovnikId?: number | null, klientId?: number | null, divisionId?: number | null } = {}
) {
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

  const start = startDate.toISOString();
  const end = endDate.toISOString();

  // Prepare queries
  let praceQuery = supabase.from('prace').select('*').gte('datum', start).lte('datum', end);
  let akceQuery = supabase.from('akce').select('*').gte('datum', start).lte('datum', end);
  let fixedCostsQuery = supabase.from('fixed_costs').select('*').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear());

  // New: Global Context Query for Overhead Rates (Minimal columns)
  // We need this to calculate "Total Company Hours" for the period, which is the denominator for Global Overhead Rate.
  // We cannot rely on 'praceQuery' because it might be filtered by worker/client.
  // ADDED: pracovnik_id is needed for accurate Worker Rate calculations below.
  const globalHoursQuery = supabase.from('prace').select('id, datum, pocet_hodin, pracovnik_id').gte('datum', start).lte('datum', end);


  // Apply Filters to Primary Queries
  if (filters.klientId) {
    akceQuery = akceQuery.eq('klient_id', filters.klientId);
  }
  if (filters.pracovnikId) {
    praceQuery = praceQuery.eq('pracovnik_id', filters.pracovnikId);
  }
  if (filters.divisionId) {
    fixedCostsQuery = fixedCostsQuery.or(`division_id.is.null,division_id.eq.${filters.divisionId}`);
    akceQuery = akceQuery.eq('division_id', filters.divisionId);
  }

  const [workersRes, clientsRes, praceRes, mzdyRes, akceRes, fixedCostsRes, globalHoursRes] = await Promise.all([
    supabase.from('pracovnici').select('*'),
    supabase.from('klienti').select('*'),
    praceQuery,
    supabase.from('mzdy').select('*').gte('rok', startDate.getFullYear() - 1).lte('rok', endDate.getFullYear() + 1),
    akceQuery,
    fixedCostsQuery,
    globalHoursQuery
  ]);

  const workers = workersRes.data || [];
  const clients = clientsRes.data || [];
  const prace = praceRes.data || [];
  const mzdy = mzdyRes.data || [];
  const akce = akceRes.data || [];
  const fixedCosts = fixedCostsRes?.data || [];
  const globalPrace = globalHoursRes.data || [];

  // 1. Build Map: Worker ID -> Base Hourly Rate
  const workerBaseRateMap = new Map<number, number>();
  workers.forEach(w => {
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

  // In-Memory Filter for Client & Division on 'prace'
  let filteredPrace = prace;

  if (filters.klientId) {
    filteredPrace = filteredPrace.filter(p => {
      const direct = p.klient_id === filters.klientId;
      const viaAction = p.akce_id && actionClientMap.get(p.akce_id) === filters.klientId;
      return direct || viaAction;
    });
  }

  if (filters.divisionId) {
    filteredPrace = filteredPrace.filter(p => {
      return p.division_id === filters.divisionId || (p.akce_id && validAkceIds.has(p.akce_id));
    });
  }

  // --- Overhead Rates Calculation (Robust) ---
  const monthlyOverheadRate = new Map<string, number>();

  // A. Prepare Costs
  const monthlyGlobalCosts = new Map<string, number>();
  const monthlySpecificCosts = new Map<string, number>();

  fixedCosts.forEach(fc => {
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
  globalPrace.forEach(p => {
    const d = new Date(p.datum);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthlyGlobalHours.set(key, (monthlyGlobalHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
  });

  const monthlyDivisionHours = new Map<string, number>();
  if (filters.divisionId && !filters.pracovnikId) {
    // We trust filteredPrace contains all division hours
    filteredPrace.forEach(p => {
      const d = new Date(p.datum);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthlyDivisionHours.set(key, (monthlyDivisionHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
    });
  }

  // C. Compute Rates
  const allRateKeys = new Set([...monthlyGlobalCosts.keys(), ...monthlySpecificCosts.keys(), ...monthlyGlobalHours.keys()]);
  allRateKeys.forEach(key => {
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
  globalPrace.forEach(p => {
    if (p.pracovnik_id) {
      const d = new Date(p.datum);
      const key = `${p.pracovnik_id}-${d.getFullYear()}-${d.getMonth() + 1}`;
      workerMonthHours.set(key, (workerMonthHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
    }
  });

  mzdy.forEach(m => {
    const key = `${m.pracovnik_id}-${m.rok}-${m.mesic}`;
    const hours = workerMonthHours.get(key) || 0;
    if (hours > 0) {
      let calculatedRate = (Number(m.celkova_castka) || 0) / hours;
      const baseRate = workerBaseRateMap.get(m.pracovnik_id) || 0;
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

  const workerAggregates = new Map<number, { id: number, name: string, hours: number, cost: number }>();

  filteredPrace.forEach(p => {
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

  const finalWorkerStats: WorkerStats[] = Array.from(workerAggregates.values()).map(w => {
    const workerInfo = workers.find(wk => wk.id === w.id);
    return {
      id: w.id,
      name: workerInfo?.jmeno || 'Neznámý',
      totalHours: w.hours,
      totalWages: w.cost,
      avgHourlyRate: w.hours > 0 ? w.cost / w.hours : 0
    };
  }).sort((a, b) => b.totalHours - a.totalHours);

  const clientStats: ClientStats[] = clients.map(c => {
    const cAkce = akce.filter(a => a.klient_id === c.id);
    const revenue = cAkce.reduce((sum, a) => sum + (Number(a.cena_klient) || 0), 0);
    const materialCost = cAkce.reduce((sum, a) => sum + (Number(a.material_my) || 0), 0);
    const laborCost = clientLaborCosts.get(c.id) || 0;
    const overheadCost = clientOverheadCosts.get(c.id) || 0;
    const totalCost = materialCost + laborCost + overheadCost;

    if (revenue === 0 && totalCost === 0) return null;

    const actions: ActionStats[] = cAkce.map(a => {
      const aRevenue = Number(a.cena_klient) || 0;
      const aMaterialCost = Number(a.material_my) || 0;
      const aLaborCost = actionLaborCosts.get(a.id) || 0;
      const aOverheadCost = actionOverheadCosts.get(a.id) || 0;
      const aTotalCost = aMaterialCost + aLaborCost + aOverheadCost;
      const aProfit = aRevenue - aTotalCost;
      const aMargin = aRevenue > 0 ? ((aRevenue - aTotalCost) / aRevenue) * 100 : 0;

      return {
        id: a.id,
        name: a.nazev,
        revenue: aRevenue,
        materialCost: aMaterialCost,
        laborCost: aLaborCost,
        totalCost: aTotalCost,
        overheadCost: aOverheadCost,
        profit: aProfit,
        margin: aMargin,
        totalHours: actionHours.get(a.id) || 0,
        isCompleted: a.is_completed
      };
    }).sort((a, b) => b.revenue - a.revenue);

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
    .filter((c): c is ClientStats => c !== null)
    .sort((a, b) => b.revenue - a.revenue);

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
  const actionIds = activeActions.map(a => a.id);
  const { data: workLogs } = await supabase
    .from('prace')
    .select('akce_id, pocet_hodin, datum, pracovnik_id')
    .in('akce_id', actionIds);

  // 3. Fetch Workers to get base rates for cost calculation
  // (We could optimize this by fetching only relevant workers, but for now simple is fine)
  const { data: workers } = await supabase.from('pracovnici').select('id, hodinova_mzda');
  const workerRateMap = new Map<number, number>();
  workers?.forEach(w => workerRateMap.set(w.id, Number(w.hodinova_mzda) || 0));

  // 4. Aggregate data per project
  const projectStats: ProjectHealthStats[] = activeActions.map(action => {
    const projectLogs = workLogs?.filter(log => log.akce_id === action.id) || [];

    let totalActualHours = 0;
    let laborCost = 0;
    let lastActivityDate: Date | null = null;

    projectLogs.forEach(log => {
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
    let budgetUsage = 0;
    if (totalEstimated > 0) {
      budgetUsage = totalActualHours / totalEstimated;
    }

    // Status Logic
    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (budgetUsage > 1.1) status = 'critical';
    else if (budgetUsage > 0.85) status = 'warning';

    // Revenue Potential
    // Logic: If fixed price defined, how much of it have we "earned"?
    // Simple approach: We count the full price as "Potential" if completed, but here it's WIP.
    // Let's define Revenue Potential as the full fixed price, so we can see what's on the table.
    // OR: completion * price. Let's use full fixed price for "Total Pipeline Value".
    const revenuePotential = Number(action.cena_klient) || 0;

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
      lastActivity: lastActivityDate ? (lastActivityDate as Date).toISOString().split('T')[0] : null
    };
  });

  // Calculate global stats
  const totalWipValue = projectStats.reduce((sum, p) => sum + p.wipValue, 0);
  const totalRevenuePotential = projectStats.reduce((sum, p) => sum + p.revenuePotential, 0);
  const projectsAtRisk = projectStats.filter(p => p.status === 'critical' || p.status === 'warning').length;

  return {
    activeProjects: projectStats.sort((a, b) => b.budgetUsage - a.budgetUsage), // Sort by risk (highest usage first)
    totalWipValue,
    totalRevenuePotential,
    projectsAtRisk
  };
}