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
export async function getDashboardData(
  period: 'month' | 'last12months' | { year: number },
  filters: { pracovnikId?: number | null, klientId?: number | null }
): Promise<DashboardData> {

  if (period === 'last12months') {
    // --- Logic for Last 12 Months (Month-by-Month) ---
    const monthlyData: MonthlyData[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const { start, end } = getISODateRange(startDate, endDate);

      // --- Revenue & Material Costs ---
      let akceQuery = supabase.from('akce').select('cena_klient, material_my, material_klient, odhad_hodin').gte('datum', start).lte('datum', end);
      if (filters.klientId) {
        akceQuery = akceQuery.eq('klient_id', filters.klientId);
      }
      const akceResult = await akceQuery;
      const totalRevenue = akceResult.data?.reduce((sum, a) => sum + (a.cena_klient || 0), 0) ?? 0;
      const totalMaterialCost = akceResult.data?.reduce((sum, a) => sum + (a.material_my || 0), 0) ?? 0;
      const totalMaterialKlient = akceResult.data?.reduce((sum, a) => sum + (a.material_klient || 0), 0) ?? 0;
      const materialProfit = akceResult.data?.reduce((sum, a) => sum + ((a.material_klient || 0) - (a.material_my || 0)), 0) ?? 0;
      const totalEstimatedHours = akceResult.data?.reduce((sum, a) => sum + (a.odhad_hodin || 0), 0) ?? 0;

      // --- Labor Costs & Hours ---
      let totalLaborCost = 0;
      let totalHours = 0;

      // Base queries for month's salaries and total work hours
      let monthMzdyQuery = supabase.from('mzdy').select('celkova_castka, pracovnik_id').eq('rok', year).eq('mesic', month + 1);
      let monthPraceQuery = supabase.from('prace').select('pocet_hodin, pracovnik_id').gte('datum', start).lte('datum', end);

      // Apply worker filter if present
      if (filters.pracovnikId) {
        monthMzdyQuery = monthMzdyQuery.eq('pracovnik_id', filters.pracovnikId);
        monthPraceQuery = monthPraceQuery.eq('pracovnik_id', filters.pracovnikId);
      }

      const [monthMzdyResult, monthPraceResult] = await Promise.all([monthMzdyQuery, monthPraceQuery]);

      const monthMzdyData = monthMzdyResult.data || [];
      const monthPraceData = monthPraceResult.data || [];

      if (!filters.klientId) {
        // No client filter: simple aggregation
        totalLaborCost = monthMzdyData.reduce((sum, m) => sum + (m.celkova_castka || 0), 0);
        totalHours = monthPraceData.reduce((sum, p) => sum + (p.pocet_hodin || 0), 0);
      } else {
        // Client filter is active: calculate prorated labor cost

        // 1. Calculate total hours for each worker
        const hoursPerWorker = new Map<number, number>();
        for (const p of monthPraceData) {
          if (p.pracovnik_id) {
            hoursPerWorker.set(p.pracovnik_id, (hoursPerWorker.get(p.pracovnik_id) || 0) + p.pocet_hodin);
          }
        }

        // 2. Calculate hourly rate for each worker
        const ratePerWorker = new Map<number, number>();
        for (const m of monthMzdyData) {
          if (m.pracovnik_id) {
            const totalHoursForWorker = hoursPerWorker.get(m.pracovnik_id);
            if (totalHoursForWorker && totalHoursForWorker > 0) {
              ratePerWorker.set(m.pracovnik_id, m.celkova_castka / totalHoursForWorker);
            }
          }
        }

        // 3. Get work done for the specific client
        let clientPraceQuery = supabase.from('prace').select('pocet_hodin, pracovnik_id').gte('datum', start).lte('datum', end).eq('klient_id', filters.klientId);
        if (filters.pracovnikId) {
          clientPraceQuery = clientPraceQuery.eq('pracovnik_id', filters.pracovnikId);
        }
        const clientPraceResult = await clientPraceQuery;
        const clientPraceData = clientPraceResult.data || [];

        // 4. Calculate labor cost and hours for the client
        for (const p of clientPraceData) {
          if (p.pracovnik_id) {
            const hourlyRate = ratePerWorker.get(p.pracovnik_id) || 0;
            totalLaborCost += p.pocet_hodin * hourlyRate;
          }
          totalHours += p.pocet_hodin;
        }
      }

      const totalCosts = totalMaterialCost + totalLaborCost;
      const grossProfit = totalRevenue - totalCosts;

      monthlyData.push({
        month: monthNames[month],
        year,
        totalRevenue,
        totalCosts,
        grossProfit,
        totalHours,
        materialProfit,
        totalMaterialKlient,
        totalLaborCost,
        totalEstimatedHours
      });
    }

    // For aggregated cards (Top Clients/Workers), query the full 12-month range with filters
    const fullRangeStartDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const fullRangeEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const { start, end } = getISODateRange(fullRangeStartDate, fullRangeEndDate);

    let aggrAkceQuery = supabase.from('akce').select('cena_klient, klient_id, klienti(nazev)').gte('datum', start).lte('datum', end);
    if (filters.klientId) aggrAkceQuery = aggrAkceQuery.eq('klient_id', filters.klientId);

    let aggrPraceQuery = supabase.from('prace').select('pocet_hodin, pracovnik_id, pracovnici(jmeno)').gte('datum', start).lte('datum', end);
    if (filters.pracovnikId) aggrPraceQuery = aggrPraceQuery.eq('pracovnik_id', filters.pracovnikId);
    if (filters.klientId) aggrPraceQuery = aggrPraceQuery.eq('klient_id', filters.klientId);

    const [aggrAkceResult, aggrPraceResult] = await Promise.all([aggrAkceQuery, aggrPraceQuery]);

    const aggregatedAkce = aggrAkceResult.data || [];
    const aggregatedPrace = aggrPraceResult.data || [];

    // Calculate aggregated totals for the entire period to show in cards
    const totalRevenue = monthlyData.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalCosts = monthlyData.reduce((sum, m) => sum + m.totalCosts, 0);
    const totalHours = monthlyData.reduce((sum, m) => sum + m.totalHours, 0);
    const totalMaterialProfit = monthlyData.reduce((sum, m) => sum + m.materialProfit, 0);
    const totalMaterialKlient = monthlyData.reduce((sum, m) => sum + m.totalMaterialKlient, 0);
    const totalLaborCost = monthlyData.reduce((sum, m) => sum + m.totalLaborCost, 0);
    const totalEstimatedHours = monthlyData.reduce((sum, m) => sum + m.totalEstimatedHours, 0);

    // Calculate Average Wages for last 12 months
    const averageHourlyWage = totalHours > 0 ? totalLaborCost / totalHours : 0;
    const averageMonthlyWage = totalLaborCost / 12; // Assuming 12 months for calculation
    const estimatedVsActualHoursRatio = totalEstimatedHours > 0 ? totalHours / totalEstimatedHours : 0;

    // Top Clients
    const clientMap = new Map<number, { name: string, total: number }>();
    for (const a of aggregatedAkce) {
      if (a.klient_id && a.klienti) {
        const current = clientMap.get(a.klient_id) || { name: a.klienti.nazev, total: 0 };
        current.total += a.cena_klient || 0;
        clientMap.set(a.klient_id, current);
      }
    }
    const topClients = Array.from(clientMap.entries()).sort(([, a], [, b]) => b.total - a.total).slice(0, 5).map(([id, data]) => ({ klient_id: id, nazev: data.name, total: data.total }));

    // Top Workers
    const workerMap = new Map<number, { name: string, total: number }>();
    for (const p of aggregatedPrace) {
      if (p.pracovnik_id && p.pracovnici) {
        const current = workerMap.get(p.pracovnik_id) || { name: p.pracovnici.jmeno, total: 0 };
        current.total += p.pocet_hodin || 0;
        workerMap.set(p.pracovnik_id, current);
      }
    }
    const topWorkers = Array.from(workerMap.entries()).sort(([, a], [, b]) => b.total - a.total).slice(0, 5).map(([id, data]) => ({ pracovnik_id: id, jmeno: data.name, total: data.total }));


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
      monthlyData,
      prevPeriod: { totalRevenue: 0, totalCosts: 0, grossProfit: 0 }, // Placeholder
    };

  } else {
    // --- Logic for Single Period (This Month or Year) ---
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else { // 'year'
      const year = typeof period === 'object' ? period.year : now.getFullYear();
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    }
    const { start, end } = getISODateRange(startDate, endDate);

    let akceQuery = supabase.from('akce').select('cena_klient, material_my, material_klient, odhad_hodin, klient_id, klienti(nazev)').gte('datum', start).lte('datum', end);
    if (filters.klientId) akceQuery = akceQuery.eq('klient_id', filters.klientId);

    let mzdyQuery = supabase.from('mzdy').select('celkova_castka, pracovnik_id').gte('rok', startDate.getFullYear()).lte('rok', endDate.getFullYear());
    if (filters.pracovnikId) mzdyQuery = mzdyQuery.eq('pracovnik_id', filters.pracovnikId);

    let praceQuery = supabase.from('prace').select('pocet_hodin, pracovnik_id, pracovnici(jmeno)').gte('datum', start).lte('datum', end);
    if (filters.pracovnikId) praceQuery = praceQuery.eq('pracovnik_id', filters.pracovnikId);
    if (filters.klientId) praceQuery = praceQuery.eq('klient_id', filters.klientId);

    const [akceResult, mzdyResult, praceResult] = await Promise.all([akceQuery, mzdyQuery, praceQuery]);

    const akceData = akceResult.data || [];
    const mzdyData = mzdyResult.data || [];
    const praceData = praceResult.data || [];

    const totalRevenue = akceData.reduce((sum, a) => sum + (a.cena_klient || 0), 0);
    const totalMaterialCost = akceData.reduce((sum, a) => sum + (a.material_my || 0), 0);
    const totalMaterialKlient = akceData.reduce((sum, a) => sum + (a.material_klient || 0), 0);
    const materialProfit = akceData.reduce((sum, a) => sum + ((a.material_klient || 0) - (a.material_my || 0)), 0);
    const totalLaborCost = mzdyData.reduce((sum, m) => sum + (m.celkova_castka || 0), 0);
    const totalCosts = totalMaterialCost + totalLaborCost;
    const totalHours = praceData.reduce((sum, p) => sum + (p.pocet_hodin || 0), 0);
    const totalEstimatedHours = akceData.reduce((sum, a) => sum + (a.odhad_hodin || 0), 0);

    // Calculate Average Wages
    const uniqueEmployeeIds = new Set(mzdyData.map(m => m.pracovnik_id));
    const uniqueEmployeeCount = uniqueEmployeeIds.size;

    let averageMonthlyWage = 0;
    if (uniqueEmployeeCount > 0) {
      if (period === 'month') {
        averageMonthlyWage = totalLaborCost / uniqueEmployeeCount;
      } else { // year
        const averageYearlySalary = totalLaborCost / uniqueEmployeeCount;
        averageMonthlyWage = averageYearlySalary / 12;
      }
    }

    const averageHourlyWage = totalHours > 0 ? totalLaborCost / totalHours : 0;
    const estimatedVsActualHoursRatio = totalEstimatedHours > 0 ? totalHours / totalEstimatedHours : 0;

    // Top Clients
    const clientMap = new Map<number, { name: string, total: number }>();
    for (const a of akceData) {
      if (a.klient_id && a.klienti) {
        const current = clientMap.get(a.klient_id) || { name: a.klienti.nazev, total: 0 };
        current.total += a.cena_klient || 0;
        clientMap.set(a.klient_id, current);
      }
    }
    const topClients = Array.from(clientMap.entries()).sort(([, a], [, b]) => b.total - a.total).slice(0, 5).map(([id, data]) => ({ klient_id: id, nazev: data.name, total: data.total }));

    // Top Workers
    const workerMap = new Map<number, { name: string, total: number }>();
    for (const p of praceData) {
      if (p.pracovnik_id && p.pracovnici) {
        const current = workerMap.get(p.pracovnik_id) || { name: p.pracovnici.jmeno, total: 0 };
        current.total += p.pocet_hodin || 0;
        workerMap.set(p.pracovnik_id, current);
      }
    }
    const topWorkers = Array.from(workerMap.entries()).sort(([, a], [, b]) => b.total - a.total).slice(0, 5).map(([id, data]) => ({ pracovnik_id: id, jmeno: data.name, total: data.total }));

    return {
      totalRevenue,
      totalCosts,
      grossProfit: totalRevenue - totalCosts,
      materialProfit,
      totalHours,
      avgCompanyRate: totalHours > 0 ? (totalRevenue - totalMaterialKlient) / totalHours : 0,
      averageHourlyWage,
      averageMonthlyWage,
      estimatedVsActualHoursRatio,
      topClients,
      topWorkers,
      monthlyData: [], // Not applicable for single period view
      prevPeriod: { totalRevenue: 0, totalCosts: 0, grossProfit: 0 }, // Placeholder
    };
  }
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
  totalCost: number;
  profit: number;
  margin: number;
  totalHours: number;
  isCompleted: boolean;
}

export async function getDetailedStats(
  period: 'last12months' | { year: number }
) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date();

  if (period === 'last12months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    const year = period.year;
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31);
  }

  const start = startDate.toISOString();
  const end = endDate.toISOString();

  const [workersRes, clientsRes, praceRes, mzdyRes, akceRes] = await Promise.all([
    supabase.from('pracovnici').select('*'),
    supabase.from('klienti').select('*'),
    supabase.from('prace').select('*').gte('datum', start).lte('datum', end),
    supabase.from('mzdy').select('*').gte('rok', startDate.getFullYear() - 1).lte('rok', endDate.getFullYear() + 1),
    supabase.from('akce').select('*').gte('datum', start).lte('datum', end) // We need all actions to map ID -> Client
  ]);

  const workers = workersRes.data || [];
  const clients = clientsRes.data || [];
  const prace = praceRes.data || [];
  const mzdy = mzdyRes.data || [];
  const akce = akceRes.data || [];

  // 1. Build Map: Worker ID -> Base Hourly Rate
  const workerBaseRateMap = new Map<number, number>();
  workers.forEach(w => {
    // Ensure we parse to float/int in case it comes as string
    const rate = Number(w.hodinova_mzda) || 0;
    workerBaseRateMap.set(w.id, rate);
  });

  // 2. Build Map: Action ID -> Client ID
  // This allows us to find the client even if the 'prace' record only has an 'akce_id'
  const actionClientMap = new Map<number, number>();
  akce.forEach(a => {
    if (a.klient_id) {
      actionClientMap.set(a.id, a.klient_id);
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
      // If total hours > 0, calculate real rate. Else use base rate.
      avgHourlyRate: totalHours > 0 ? totalWages / totalHours : (workerBaseRateMap.get(w.id) || 0)
    };
  }).sort((a, b) => b.totalHours - a.totalHours);


  // Process Clients (Labor Cost Calculation)

  // 3. Calculate Real Monthly Rates from Mzdy (Payroll)
  // key: "workerId-year-month" -> rate
  const workerRealMonthlyRates = new Map<string, number>();

  // First, sum hours per worker per month to calculate the rate
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
  const clientHours = new Map<number, number>();
  const actionLaborCosts = new Map<number, number>();
  const actionHours = new Map<number, number>();

  prace.forEach(p => {
    // Determine Client ID: Try direct link first, then via Action
    let clientId = p.klient_id;
    if (!clientId && p.akce_id) {
      clientId = actionClientMap.get(p.akce_id);
    }

    if (!clientId) return; // Skip if orphan (no client found)

    const d = new Date(p.datum);

    // Determine Rate
    // A: Try specific monthly rate (from finalized payroll)
    const rateKey = `${p.pracovnik_id}-${d.getFullYear()}-${d.getMonth() + 1}`;
    let rate = workerRealMonthlyRates.get(rateKey);

    // B: Fallback to Base Rate (from Worker profile)
    if (rate === undefined || rate === null) {
      rate = workerBaseRateMap.get(p.pracovnik_id);
    }

    // C: Final safety fallback
    if (!rate) rate = 0;

    const hours = Number(p.pocet_hodin) || 0;
    const cost = hours * rate;

    clientLaborCosts.set(clientId, (clientLaborCosts.get(clientId) || 0) + cost);
    clientHours.set(clientId, (clientHours.get(clientId) || 0) + hours);

    // Track costs per Action if available
    if (p.akce_id) {
      actionLaborCosts.set(p.akce_id, (actionLaborCosts.get(p.akce_id) || 0) + cost);
      actionHours.set(p.akce_id, (actionHours.get(p.akce_id) || 0) + hours);
    }
  });

  const clientStats: ClientStats[] = clients.map(c => {
    const cAkce = akce.filter(a => a.klient_id === c.id);
    const revenue = cAkce.reduce((sum, a) => sum + (Number(a.cena_klient) || 0), 0);
    const materialCost = cAkce.reduce((sum, a) => sum + (Number(a.material_my) || 0), 0);
    const laborCost = clientLaborCosts.get(c.id) || 0;
    const totalCost = materialCost + laborCost;

    // Calculate stats for each action of this client
    const actions: ActionStats[] = cAkce.map(a => {
      const aRevenue = Number(a.cena_klient) || 0;
      const aMaterialCost = Number(a.material_my) || 0;
      const aLaborCost = actionLaborCosts.get(a.id) || 0;
      const aTotalCost = aMaterialCost + aLaborCost;
      const aProfit = aRevenue - aTotalCost;
      const aMargin = aRevenue > 0 ? ((aRevenue - aTotalCost) / aRevenue) * 100 : 0;

      return {
        id: a.id,
        name: a.nazev, // Assuming 'nazev' exists on akce
        revenue: aRevenue,
        materialCost: aMaterialCost,
        laborCost: aLaborCost,
        totalCost: aTotalCost,
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
      totalCost,
      profit: revenue - totalCost,
      margin: revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0,
      totalHours: clientHours.get(c.id) || 0,
      actions
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return { workers: workerStats, clients: clientStats };
}