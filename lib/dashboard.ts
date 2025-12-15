import { supabase } from '@/lib/supabase';

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
  totalEstimatedHours: number;
}

export interface DashboardData {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  materialProfit: number;
  totalHours: number;
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

// Main data fetching function
// Main data fetching function
// Main data fetching function - OPTIMIZED
export async function getDashboardData(
  period: 'month' | 'last12months' | { year: number; month?: number },
  filters: { pracovnikId?: number | null, klientId?: number | null }
): Promise<DashboardData> {

  // 1. Determine Date Range
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  const isLast12Months = period === 'last12months';

  if (isLast12Months) {
    // Show data from 2025-01-01 onwards, up to last 12 months
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const limitDate = new Date(2025, 0, 1); // Jan 1, 2025
    if (startDate < limitDate) startDate = limitDate;
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    // Specific Year or Month
    const pYear = typeof period === 'object' ? period.year : now.getFullYear();
    if (typeof period === 'object' && period.month !== undefined && period.month !== null) {
      startDate = new Date(pYear, period.month, 1);
      endDate = new Date(pYear, period.month + 1, 0);
    } else {
      startDate = new Date(pYear, 0, 1);
      endDate = new Date(pYear, 11, 31);
    }
  }

  const { start, end } = getISODateRange(startDate, endDate);

  // 2. Prepare Queries (Bulk Fetch)
  let akceQuery = supabase.from('akce').select('id, datum, cena_klient, material_my, material_klient, odhad_hodin, klient_id, klienti(nazev)').gte('datum', start).lte('datum', end);
  let praceQuery = supabase.from('prace').select('id, datum, pocet_hodin, pracovnik_id, klient_id, akce_id, pracovnici(jmeno)').gte('datum', start).lte('datum', end);

  // Mzdy needs a slightly wider range to be safe or just matching years
  let mzdyQuery = supabase.from('mzdy').select('rok, mesic, celkova_castka, pracovnik_id').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear());

  let fixedCostsQuery = supabase.from('fixed_costs').select('rok, mesic, castka').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear());

  // Apply filters to initial fetch where appropriate to reduce data transfer?
  // Actually, for "Top Clients" and "Top Workers" we usually need global data if we want to show context, but the requirements say "Top Clients" (implied filtered?).
  // If I filter `akce` by `klientId`, I won't get other clients for the "Top Clients" list if the user wanted that.
  // BUT: The UI usually shows "Top Clients" relevant to the current view. If I filter for Client A, "Top Clients" is just Client A.
  // So yes, applying filters to SQL is efficient and correct.

  if (filters.klientId) {
    akceQuery = akceQuery.eq('klient_id', filters.klientId);
    praceQuery = praceQuery.eq('klient_id', filters.klientId); // Note: Prace might be linked via akce_id, relying on redundant column or join. Prace table has klient_id? Yes, schema says so.
    // What if prace is linked only via akce? The schema_audit said `prace.klient_id` exists. Ideally we trust it.
    // If not, we'd need to fetch all and filter in JS. Let's assume `klient_id` is reliable on `prace`.
  }
  if (filters.pracovnikId) {
    praceQuery = praceQuery.eq('pracovnik_id', filters.pracovnikId);
    mzdyQuery = mzdyQuery.eq('pracovnik_id', filters.pracovnikId);
    // Note: If we filter Mzdy by worker, we only get that worker's cost. Correct.
  }

  // 3. Execute Parallel Queries
  const [akceRes, praceRes, mzdyRes, fixedCostsRes] = await Promise.all([
    akceQuery,
    praceQuery,
    mzdyQuery,
    fixedCostsQuery
  ]);

  const akceData = akceRes.data || [];
  const praceData = praceRes.data || [];
  const mzdyData = mzdyRes.data || [];
  const fixedCostsData = fixedCostsRes.data || [];

  // 4. Client-Side Aggregation
  // We need to group sets by Month (YYYY-M) for the chart/monthly table.

  // Initialize buckets for the requested range
  const monthlyBuckets = new Map<string, MonthlyData>();

  // Helper to generate keys
  const getMonthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`; // using 0-indexed month for keys to match JS Date
  const getMonthLabel = (monthIndex: number) => monthNames[monthIndex];

  // Pre-fill buckets if last12months or specific year (to show empty months)
  if (isLast12Months) {
    // Loop last 12 months backwards or forwards? Order doesn't matter for Map, we sort later.
    // Let's go from start to end.
    let curr = new Date(startDate);
    while (curr <= endDate) {
      const key = getMonthKey(curr);
      if (!monthlyBuckets.has(key)) {
        monthlyBuckets.set(key, {
          month: getMonthLabel(curr.getMonth()),
          year: curr.getFullYear(),
          totalRevenue: 0, totalCosts: 0, grossProfit: 0, totalHours: 0,
          materialProfit: 0, totalMaterialKlient: 0, totalLaborCost: 0, totalEstimatedHours: 0
        });
      }
      curr.setMonth(curr.getMonth() + 1);
    }
  } else if (period === 'year' || (typeof period === 'object' && !period.month)) {
    // Full year 12 months
    const y = (typeof period === 'object' ? period.year : new Date().getFullYear());
    for (let m = 0; m < 12; m++) {
      const key = `${y}-${m}`;
      monthlyBuckets.set(key, {
        month: getMonthLabel(m),
        year: y,
        totalRevenue: 0, totalCosts: 0, grossProfit: 0, totalHours: 0,
        materialProfit: 0, totalMaterialKlient: 0, totalLaborCost: 0, totalEstimatedHours: 0
      });
    }
  }

  // A. Process Akce (Revenue, Material)
  for (const a of akceData) {
    const d = new Date(a.datum);
    const key = getMonthKey(d);

    // If we are viewing a single month, we might need a bucket for it if not initialized
    if (!monthlyBuckets.has(key) && !isLast12Months && period !== 'year') {
      monthlyBuckets.set(key, {
        month: getMonthLabel(d.getMonth()), year: d.getFullYear(),
        totalRevenue: 0, totalCosts: 0, grossProfit: 0, totalHours: 0,
        materialProfit: 0, totalMaterialKlient: 0, totalLaborCost: 0, totalEstimatedHours: 0
      });
    }

    const bucket = monthlyBuckets.get(key);
    if (bucket) {
      bucket.totalRevenue += (a.cena_klient || 0);
      bucket.totalMaterialKlient += (a.material_klient || 0);
      bucket.materialProfit += ((a.material_klient || 0) - (a.material_my || 0));
      bucket.totalCosts += (a.material_my || 0); // Add material cost to total costs
      bucket.totalEstimatedHours += (a.odhad_hodin || 0);
    }
  }

  // B. Process Labor Costs (Complex part)

  // First, map global Hours per Worker per Month (needed for rate calc)
  // If we are filtering by client, we fetched ONLY that client's work.
  // BUT to calculate the worker's rate (Month Salary / Total Hours), we need their TOTAL hours, not just this client's hours.
  // CRITICAL: If filtering by Client, our `praceQuery` filtered by client. We are missing the "Total Hours" context to calculate rate!
  // FIX: If filtering by Client, we need a separate "Stats Query" for worker totals.
  // For performance, let's accept a small inaccuracy or fetch "Worker Totals" in a separate lightweight query if filters are active.
  // actually, `getDetailedStats` does `workerRealMonthlyRates` correctly by fetching ALL data.
  // To keep `getDashboardData` fast, let's do this:
  // If `filters.klientId` is set, we need to know the rates. 
  // Let's try to fetch "Total Hours per Worker" using a `rpc` call or a separate aggregate query?
  // OR, simply fetch ALL `prace` for the period (lightweight: id, pracovnik_id, pocet_hodin, datum) without client filter if possible?
  // `prace` table is likely the largest. Fetching all rows for a year might be 1000s. Not too bad for JSON.
  // Let's modify step 2: If client filter is ON, we fetch ALL `prace` (just hours) to calc rates, but only count filtered `prace` for stats.

  let allPraceDataForRates = praceData;
  if (filters.klientId) {
    // We need extra data to calculate rates correctly. 
    // Let's do a quick separate fetch for "All Hours" for the relevant workers in this period.
    // Optimization: Only fetch for workers involved in the filtered result? No, we don't know them yet.
    // Let's just fetch simplified all-prace for the period.
    const { data: globalPrace } = await supabase.from('prace').select('pracovnik_id, pocet_hodin, datum').gte('datum', start).lte('datum', end);
    allPraceDataForRates = globalPrace || [];
  }

  // Calc Rates
  const workerMonthHours = new Map<string, number>(); // "WorkerID-YYYY-M" -> hours
  for (const p of allPraceDataForRates) {
    const d = new Date(p.datum);
    const key = `${p.pracovnik_id}-${d.getFullYear()}-${d.getMonth()}`;
    workerMonthHours.set(key, (workerMonthHours.get(key) || 0) + (p.pocet_hodin || 0));
  }

  const workerMonthRate = new Map<string, number>(); // "WorkerID-YYYY-M" -> rate
  for (const m of mzdyData) {
    const key = `${m.pracovnik_id}-${m.rok}-${m.mesic - 1}`; // mesic is 1-based in DB
    const hours = workerMonthHours.get(key) || 0;
    if (hours > 0) {
      workerMonthRate.set(key, (m.celkova_castka || 0) / hours);
    }
    // Note: If no hours recorded but salary exists, rate is undefined (infinite). We handle this by adding 0 cost or using base rate? 
    // Usually implies fixed salary without logged hours. Complex. Let's ignore for now or assume 0 labor cost impact if no hours.
  }

  // Now aggregate Labor Costs into Buckets
  // If NO Client filter is active, we can just Sum Mzdy into buckets directly (Simpler & More Accurate for Company Wide).
  // If Client filter IS active, we MUST iterate Prace and use Rates.

  if (!filters.klientId) {
    // Simple Mode: Sum Mzdy
    for (const m of mzdyData) {
      // Mzdy has rok/mesic.
      const d = new Date(m.rok, m.mesic - 1, 1);
      // Check if this month is within our requested range? The query constrained it, so yes.
      const key = getMonthKey(d);
      if (!monthlyBuckets.has(key) && !isLast12Months && period !== 'year') {
        // Init bucket if missing (for single month view)
        monthlyBuckets.set(key, {
          month: getMonthLabel(d.getMonth()), year: d.getFullYear(),
          totalRevenue: 0, totalCosts: 0, grossProfit: 0, totalHours: 0,
          materialProfit: 0, totalMaterialKlient: 0, totalLaborCost: 0, totalEstimatedHours: 0
        });
      }
      const bucket = monthlyBuckets.get(key);
      if (bucket) {
        bucket.totalLaborCost += (m.celkova_castka || 0);
        bucket.totalCosts += (m.celkova_castka || 0);
      }
    }
    // Also sum hours from prace
    for (const p of praceData) {
      const d = new Date(p.datum);
      const key = getMonthKey(d);
      const bucket = monthlyBuckets.get(key);
      if (bucket) bucket.totalHours += (p.pocet_hodin || 0);
    }
  } else {
    // Filter Mode: Iterate Prace (which is filtered) and apply rates
    for (const p of praceData) {
      const d = new Date(p.datum);
      const key = getMonthKey(d);
      const rateKey = `${p.pracovnik_id}-${d.getFullYear()}-${d.getMonth()}`;
      const rate = workerMonthRate.get(rateKey) || 0; // Fallback to 0 or base rate? 0 is safer for "real cost".

      const cost = (p.pocet_hodin || 0) * rate;

      const bucket = monthlyBuckets.get(key);
      if (bucket) {
        bucket.totalHours += (p.pocet_hodin || 0);
        bucket.totalLaborCost += cost;
        bucket.totalCosts += cost;
      }
    }
  }

  // C. Fixed Costs
  // Same logic: If NO filter, add all. If Filter, add 0 (as per previous agreement).
  if (!filters.klientId && !filters.pracovnikId) {
    for (const fc of fixedCostsData) {
      const d = new Date(fc.rok, fc.mesic - 1, 1);
      const key = getMonthKey(d);
      const bucket = monthlyBuckets.get(key);
      if (bucket) {
        const val = (Number(fc.castka) || 0);
        bucket.totalCosts += val;
        // Note: We don't have a specific field for 'fixedCosts' in MonthlyData interface, 
        // but it's part of totalCosts.
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

  const workerMap = new Map<number, { name: string, total: number }>();
  for (const p of praceData) {
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
    grossProfit: totalRevenue - totalCosts,
    materialProfit: totalMaterialProfit,
    totalHours,
    avgCompanyRate: totalHours > 0 ? (totalRevenue - totalMaterialKlient) / totalHours : 0,
    averageHourlyWage,
    averageMonthlyWage,
    estimatedVsActualHoursRatio,
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
  period: 'last12months' | { year: number; month?: number }
) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === 'last12months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const limitDate = new Date(2025, 0, 1);
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

  const [workersRes, clientsRes, praceRes, mzdyRes, akceRes, fixedCostsRes] = await Promise.all([
    supabase.from('pracovnici').select('*'),
    supabase.from('klienti').select('*'),
    supabase.from('prace').select('*').gte('datum', start).lte('datum', end),
    supabase.from('mzdy').select('*').gte('rok', startDate.getFullYear() - 1).lte('rok', endDate.getFullYear() + 1),
    supabase.from('akce').select('*').gte('datum', start).lte('datum', end),
    supabase.from('fixed_costs').select('*').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear())
  ]);

  const workers = workersRes.data || [];
  const clients = clientsRes.data || [];
  const prace = praceRes.data || [];
  const mzdy = mzdyRes.data || [];
  const akce = akceRes.data || [];
  const fixedCosts = fixedCostsRes?.data || [];

  // 1. Build Map: Worker ID -> Base Hourly Rate
  const workerBaseRateMap = new Map<number, number>();
  workers.forEach(w => {
    // Ensure we parse to float/int in case it comes as string
    const rate = Number(w.hodinova_mzda) || 0;
    workerBaseRateMap.set(w.id, rate);
  });

  // 2. Build Map: Action ID -> Client ID
  const actionClientMap = new Map<number, number>();
  akce.forEach(a => {
    if (a.klient_id) {
      actionClientMap.set(a.id, a.klient_id);
    }
  });

  // --- NEW: Calculate Overhead Rates (Month by Month) ---
  const monthlyOverheadRate = new Map<string, number>(); // "YYYY-M" -> rate per hour

  // A. Sum Fixed Costs per Month
  const monthlyFixedCosts = new Map<string, number>();
  fixedCosts.forEach(fc => {
    const key = `${fc.rok}-${fc.mesic}`;
    monthlyFixedCosts.set(key, (monthlyFixedCosts.get(key) || 0) + (Number(fc.castka) || 0));
  });

  // B. Sum Total Hours per Month (Global)
  const monthlyTotalHours = new Map<string, number>();
  prace.forEach(p => {
    const d = new Date(p.datum);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthlyTotalHours.set(key, (monthlyTotalHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
  });

  // C. Calculate Rate
  monthlyFixedCosts.forEach((cost, key) => {
    const hours = monthlyTotalHours.get(key) || 0;
    if (hours > 0) {
      monthlyOverheadRate.set(key, cost / hours);
    }
  });


  // Process Workers Stats
  const workerStats: WorkerStats[] = workers.map(w => {
    const wPrace = prace.filter(p => p.pracovnik_id === w.id);
    const wMzdy = mzdy.filter(m => {
      if (m.pracovnik_id !== w.id) return false;
      const mDate = new Date(m.rok, m.mesic - 1, 1);
      return mDate >= startDate && mDate <= endDate;
    });

    const totalHours = wPrace.reduce((sum, p) => sum + (Number(p.pocet_hodin) || 0), 0);
    const totalWages = wMzdy.reduce((sum, m) => sum + (Number(m.celkova_castka) || 0), 0);

    return {
      id: w.id,
      name: w.jmeno,
      totalHours,
      totalWages,
      avgHourlyRate: totalHours > 0 ? totalWages / totalHours : (workerBaseRateMap.get(w.id) || 0)
    };
  })
    .filter(w => w.totalHours > 0 || w.totalWages > 0)
    .sort((a, b) => b.totalHours - a.totalHours);


  // Process Clients (Labor & Overhead Cost Calculation)

  // 3. Calculate Real Monthly Rates from Mzdy
  const workerRealMonthlyRates = new Map<string, number>();
  const workerMonthHours = new Map<string, number>();
  prace.forEach(p => {
    const d = new Date(p.datum);
    const key = `${p.pracovnik_id}-${d.getFullYear()}-${d.getMonth() + 1}`;
    workerMonthHours.set(key, (workerMonthHours.get(key) || 0) + (Number(p.pocet_hodin) || 0));
  });

  mzdy.forEach(m => {
    const key = `${m.pracovnik_id}-${m.rok}-${m.mesic}`;
    const hours = workerMonthHours.get(key) || 0;
    if (hours > 0) {
      workerRealMonthlyRates.set(key, (Number(m.celkova_castka) || 0) / hours);
    }
  });

  // 4. Aggregate Costs per Client
  const clientLaborCosts = new Map<number, number>();
  const clientOverheadCosts = new Map<number, number>(); // NEW
  const clientHours = new Map<number, number>();
  const actionLaborCosts = new Map<number, number>();
  const actionOverheadCosts = new Map<number, number>(); // NEW
  const actionHours = new Map<number, number>();

  prace.forEach(p => {
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
  });

  const clientStats: ClientStats[] = clients.map(c => {
    const cAkce = akce.filter(a => a.klient_id === c.id);
    const revenue = cAkce.reduce((sum, a) => sum + (Number(a.cena_klient) || 0), 0);
    const materialCost = cAkce.reduce((sum, a) => sum + (Number(a.material_my) || 0), 0);
    const laborCost = clientLaborCosts.get(c.id) || 0;
    const overheadCost = clientOverheadCosts.get(c.id) || 0;
    const totalCost = materialCost + laborCost + overheadCost;

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
  }).sort((a, b) => b.revenue - a.revenue);

  return { workers: workerStats, clients: clientStats };
}

export interface ProjectHealthStats {
  id: number;
  name: string;
  clientName: string;
  totalEstimatedHours: number;
  totalActualHours: number;
  budgetUsage: number; // 0-1 (e.g. 0.8 for 80%)
  wipValue: number; // Cost based value of work done
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

export async function getExperimentalStats(): Promise<ExperimentalStats> {
  // 1. Fetch ALL uncompleted actions (Active Projects)
  const { data: activeActions } = await supabase
    .from('akce')
    .select('*, klienti(nazev)')
    .eq('is_completed', false)
    .order('created_at', { ascending: false });

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
      // @ts-ignore
      clientName: Array.isArray(action.klienti) ? action.klienti[0]?.nazev : action.klienti?.nazev || 'Neznámý',
      totalEstimatedHours: totalEstimated,
      totalActualHours,
      budgetUsage,
      wipValue: totalCost,
      revenuePotential,
      status,
      lastActivity: lastActivityDate ? lastActivityDate.toISOString().split('T')[0] : null
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