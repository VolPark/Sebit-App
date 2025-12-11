'use client'
import { useState, useEffect, useMemo, Fragment } from 'react';
import { getDashboardData, getDetailedStats, DashboardData, MonthlyData, WorkerStats, ClientStats } from '@/lib/dashboard';
import { supabase } from '@/lib/supabase';
import BarChart from '@/components/BarChart';
import DashboardSkeleton from '@/components/DashboardSkeleton';

type FilterOption = { id: number; name: string };

const KPICard = ({ title, value, helpText, percentage, percentageColor }: { title: string, value: string, helpText?: string, percentage?: string, percentageColor?: string }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80">
      <div className="flex justify-between items-start">
        <p className="text-sm font-semibold text-gray-500 uppercase">{title}</p>
        {percentage && <span className={`text-lg font-bold ${percentageColor}`}>{percentage}</span>}
      </div>
      <p className="text-2xl md:text-3xl font-bold mt-2 text-[#333333]">{value}</p>
      {helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>}
    </div>
  );
};

const DashboardControls = ({ period, setPeriod, filters, setFilters, workers, clients, year, setYear, availableYears, showFilters, month, setMonth }: any) => (
  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
    <div className="p-1 bg-gray-100 rounded-full flex items-center w-fit">
      {(['last12months', 'year'] as const).map(p => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${period === p ? 'bg-white shadow text-black' : 'text-gray-600 hover:bg-white/60'}`}
        >
          {p === 'last12months' ? 'Posl. 12 měsíců' : 'Roční přehled'}
        </button>
      ))}
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {period === 'year' && (
        <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-2">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="w-full rounded-lg bg-white border-slate-300 p-2.5 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30"
          >
            {availableYears.map((y: number) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={month}
            onChange={e => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full rounded-lg bg-white border-slate-300 p-2.5 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30"
          >
            <option value="all">Celý rok</option>
            {['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>
      )}
      {showFilters && (
        <>
          <select
            value={filters.pracovnikId || ''}
            onChange={e => setFilters({ ...filters, pracovnikId: e.target.value ? Number(e.target.value) : null })}
            className={`w-full rounded-lg bg-white border-slate-300 p-2.5 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 sm:col-span-1 ${period !== 'year' ? 'col-start-1' : ''}`}
          >
            <option value="">Všichni pracovníci</option>
            {workers.map((w: FilterOption) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select
            value={filters.klientId || ''}
            onChange={e => setFilters({ ...filters, klientId: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-lg bg-white border-slate-300 p-2.5 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 sm:col-span-1"
          >
            <option value="">Všichni klienti</option>
            {clients.map((c: FilterOption) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </>
      )}
    </div>
  </div>
);

const AdditionalKpis = ({ data, currency }: { data: DashboardData, currency: Intl.NumberFormat }) => (
  <>
    <KPICard title="Odpracované hodiny" value={data.totalHours.toLocaleString('cs-CZ') + ' h'} />
    <KPICard title="Prům. Sazba Firmy" value={currency.format(data.avgCompanyRate) + '/h'} />
    <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80">
      <p className="text-sm font-semibold text-gray-500 uppercase">PRŮM. HODINOVÁ MZDA</p>
      <p className="text-2xl md:text-3xl font-bold mt-2 text-[#333333]">{currency.format(data.averageHourlyWage)}<span className="text-xl text-gray-400">/h</span></p>
      <p className="text-sm text-gray-500 mt-1">
        Prům. měsíční: {currency.format(data.averageMonthlyWage)}
      </p>
    </div>
    <KPICard
      title="Odhad vs. Realita"
      value={`${(data.estimatedVsActualHoursRatio * 100).toFixed(2)}%`}
      percentageColor={data.estimatedVsActualHoursRatio >= 1 ? 'text-green-500' : 'text-red-500'}
    />
  </>
);

const WorkersTable = ({ data }: { data: WorkerStats[] }) => (
  <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/80 overflow-hidden overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-gray-50 border-b text-gray-600">
        <tr>
          <th className="p-4 whitespace-nowrap">Jméno</th>
          <th className="p-4 text-right whitespace-nowrap">Odpracováno</th>
          <th className="p-4 text-right whitespace-nowrap">Vyplaceno (Mzdy)</th>
          <th className="p-4 text-right whitespace-nowrap">Prům. sazba</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {data.map(w => (
          <tr key={w.id} className="hover:bg-gray-50">
            <td className="p-4 font-medium text-gray-900">{w.name}</td>
            <td className="p-4 text-right">{w.totalHours.toLocaleString('cs-CZ')} h</td>
            <td className="p-4 text-right">{w.totalWages.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })}</td>
            <td className="p-4 text-right">{w.avgHourlyRate.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })}/h</td>
          </tr>
        ))}
        {data.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">Žádná data</td></tr>}
      </tbody>
    </table>
  </div>
);

const ClientsTable = ({ data }: { data: ClientStats[] }) => {
  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof ClientStats; direction: 'asc' | 'desc' } | null>(null);

  const toggleClient = (id: number) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedClients(newExpanded);
  };

  const requestSort = (key: keyof ClientStats) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle potential undefined/types
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }

        // For numbers
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const currency = (val: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/80 overflow-hidden overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100 text-gray-600 border-b">
          <tr>
            <th className="p-4 whitespace-nowrap w-8"></th>
            <th className="p-4 whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('name')}>
              <div className="flex items-center gap-1">Klient {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
            </th>
            <th className="p-4 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('totalHours')}>
              <div className="flex items-center justify-end gap-1">Počet hodin {sortConfig?.key === 'totalHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
            </th>
            <th className="p-4 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('revenue')}>
              <div className="flex items-center justify-end gap-1">Příjmy {sortConfig?.key === 'revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
            </th>
            <th className="p-4 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('materialCost')}>
              <div className="flex items-center justify-end gap-1">Náklady (Mat.) {sortConfig?.key === 'materialCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
            </th>
            <th className="p-4 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('laborCost')}>
              <div className="flex items-center justify-end gap-1">Náklady (Práce) {sortConfig?.key === 'laborCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
            </th>
            <th className="p-4 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('totalCost')}>
              <div className="flex items-center justify-end gap-1">Celkem Náklady {sortConfig?.key === 'totalCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
            </th>
            <th className="p-4 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('profit')}>
              <div className="flex items-center justify-end gap-1">Zisk {sortConfig?.key === 'profit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
            </th>
            <th className="p-4 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('margin')}>
              <div className="flex items-center justify-end gap-1">Marže {sortConfig?.key === 'margin' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedData.map(c => (
            <Fragment key={c.id}>
              <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleClient(c.id)}>
                <td className="p-4 text-center">
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className={`w-4 h-4 transform transition-transform ${expandedClients.has(c.id) ? 'rotate-90' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </td>
                <td className="p-4 font-medium text-gray-900">{c.name}</td>
                <td className="p-4 text-right font-medium">{c.totalHours.toLocaleString('cs-CZ')} h</td>
                <td className="p-4 text-right font-medium">{currency(c.revenue)}</td>
                <td className="p-4 text-right text-gray-600">{currency(c.materialCost)}</td>
                <td className="p-4 text-right text-gray-600">{currency(c.laborCost)}</td>
                <td className="p-4 text-right text-red-600 font-medium">{currency(c.totalCost)}</td>
                <td className={`p-4 text-right font-bold ${c.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currency(c.profit)}</td>
                <td className={`p-4 text-right ${c.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{c.margin.toFixed(1)}%</td>
              </tr>
              {expandedClients.has(c.id) && (
                <tr className="bg-gray-50/50">
                  <td colSpan={9} className="p-0">
                    <div className="py-2 pl-4 pr-4 border-b border-gray-100 shadow-inner bg-gray-50">
                      <table className="w-full text-xs">
                        <thead className="text-gray-500 border-b border-gray-200">
                          <tr>
                            <th className="py-2 pl-10 text-left font-medium uppercase tracking-wider">Akce</th>
                            <th className="py-2 text-right font-medium uppercase tracking-wider">Počet hodin</th>
                            <th className="py-2 text-right font-medium uppercase tracking-wider">Příjmy</th>
                            <th className="py-2 text-right font-medium uppercase tracking-wider">Materiál</th>
                            <th className="py-2 text-right font-medium uppercase tracking-wider">Práce</th>
                            <th className="py-2 text-right font-medium uppercase tracking-wider">Náklady</th>
                            <th className="py-2 text-right font-medium uppercase tracking-wider">Zisk</th>
                            <th className="py-2 text-right font-medium uppercase tracking-wider">Marže</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {c.actions.map(action => (
                            <tr key={action.id} className="hover:bg-gray-100/50">
                              <td className="py-2 pl-10 text-gray-700">
                                <span className={action.isCompleted ? 'line-through text-gray-400' : ''}>{action.name}</span>
                              </td>
                              <td className="py-2 text-right text-gray-600">{action.totalHours.toLocaleString('cs-CZ')} h</td>
                              <td className="py-2 text-right text-gray-600">{currency(action.revenue)}</td>
                              <td className="py-2 text-right text-gray-500">{currency(action.materialCost)}</td>
                              <td className="py-2 text-right text-gray-500">{currency(action.laborCost)}</td>
                              <td className="py-2 text-right text-red-500">{currency(action.totalCost)}</td>
                              <td className={`py-2 text-right font-medium ${action.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currency(action.profit)}</td>
                              <td className={`py-2 text-right ${action.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{action.margin.toFixed(1)}%</td>
                            </tr>
                          ))}
                          {c.actions.length === 0 && (
                            <tr>
                              <td colSpan={8} className="py-4 text-center text-gray-400 italic">Žádné akce pro toto období</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {sortedData.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-500">Žádná data</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

export default function DashboardPage() {
  const [view, setView] = useState<'firma' | 'workers' | 'clients'>('firma');

  const [data, setData] = useState<DashboardData | null>(null);
  const [detailedStats, setDetailedStats] = useState<{ workers: WorkerStats[], clients: ClientStats[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'last12months' | 'year'>('last12months');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | 'all'>('all'); // NEW: Month state
  const [filters, setFilters] = useState<{ pracovnikId?: number | null, klientId?: number | null }>({});

  const [workers, setWorkers] = useState<FilterOption[]>([]);
  const [clients, setClients] = useState<FilterOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyData | null>(null);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2025;
    const years = [];
    for (let y = currentYear; y >= startYear; y--) {
      years.push(y);
    }
    // If current year is before 2025 (unlikely based on requirements, but safe), ensure 2025 is there
    if (years.length === 0) years.push(2025);
    return years;
  }, []);

  useEffect(() => {
    async function loadFilters() {
      const { data: workerData } = await supabase.from('pracovnici').select('id, jmeno').order('jmeno');
      const { data: clientData } = await supabase.from('klienti').select('id, nazev').order('nazev');
      setWorkers(workerData?.map(w => ({ id: w.id, name: w.jmeno })) || []);
      setClients(clientData?.map(c => ({ id: c.id, name: c.nazev })) || []);
    }
    loadFilters();
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      const periodParam = period === 'year' ? { year, month: month === 'all' ? undefined : month } : period;

      const [dashboardData, stats] = await Promise.all([
        getDashboardData(periodParam, filters),
        getDetailedStats(periodParam)
      ]);

      setData(dashboardData);
      setDetailedStats(stats);

      setSelectedMonth(null);
      setLoading(false);
    }
    loadDashboard();
  }, [period, filters, year, month]);

  const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), []);

  const handleMonthClick = (monthData: MonthlyData) => {
    if (selectedMonth && selectedMonth.month === monthData.month && selectedMonth.year === monthData.year) {
      setSelectedMonth(null);
    } else {
      setSelectedMonth(monthData);
    }
  };

  const kpiData = selectedMonth ?? data;

  const renderKpis = (d: DashboardData | MonthlyData | null) => {
    if (!d) return null;

    const grossProfit = d.grossProfit;
    const materialProfit = d.materialProfit;

    const costsPercentage = d.totalRevenue > 0 ? `${(d.totalCosts / d.totalRevenue * 100).toFixed(0)}%` : `0%`;
    const profitPercentage = d.totalRevenue > 0 ? `${(grossProfit / d.totalRevenue * 100).toFixed(0)}%` : `0%`;
    const materialProfitPercentage = d.totalRevenue > 0 ? `${(materialProfit / d.totalRevenue * 100).toFixed(0)}%` : `0%`;

    let helpText: string;
    let titleSuffix: string = '';

    // Helper to get month name by index
    const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

    if (selectedMonth) {
      helpText = `Data za ${selectedMonth.month} ${selectedMonth.year}`;
    } else if (period === 'last12months') {
      helpText = "Za posledních 12 měsíců";
      titleSuffix = 'Celkové '
    } else if (month !== 'all' && typeof month === 'number') {
      helpText = `Data za ${monthNames[month]} ${year}`;
    } else {
      helpText = `Data za rok ${year}`;
    }

    return (
      <>
        <KPICard title={`${titleSuffix}Příjmy`} value={currency.format(d.totalRevenue)} helpText={helpText} />
        <KPICard title={`${titleSuffix}Náklady`} value={currency.format(d.totalCosts)} helpText={helpText} percentage={costsPercentage} percentageColor="text-red-500" />
        <KPICard title={`${titleSuffix}Zisk`} value={currency.format(grossProfit)} helpText={helpText} percentage={profitPercentage} percentageColor="text-green-500" />
        <KPICard title="Zisk na materiálu" value={currency.format(materialProfit)} helpText={helpText} percentage={materialProfitPercentage} percentageColor="text-green-500" />
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-8">
      <h2 className="text-3xl font-bold mb-6 text-black">Dashboard</h2>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {[
          { id: 'firma', label: 'Firma' },
          { id: 'workers', label: 'Zaměstnanci' },
          { id: 'clients', label: 'Klienti' }
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id as any)}
            className={`px-5 py-2.5 rounded-md text-sm font-medium transition-all ${view === v.id ? 'bg-white shadow text-[#E30613]' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <DashboardControls
        period={period} setPeriod={setPeriod}
        filters={filters} setFilters={setFilters}
        workers={workers} clients={clients}
        year={year} setYear={setYear} availableYears={availableYears}
        showFilters={view === 'firma'}
        month={month} setMonth={setMonth}
      />

      {loading || !data || !detailedStats ? (
        <DashboardSkeleton view={view} />
      ) : (
        <>
          {view === 'firma' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {period === 'last12months' ? (
                <div className="space-y-6">
                  <BarChart
                    data={data.monthlyData}
                    onMonthClick={handleMonthClick}
                    selectedMonth={selectedMonth}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {renderKpis(kpiData)}
                    <AdditionalKpis data={kpiData as DashboardData} currency={currency} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderKpis(data)}
                  <AdditionalKpis data={data} currency={currency} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase">TOP Klienti</h3>
                  <ul className="mt-3 space-y-2">
                    {data.topClients.map(c => (
                      <li key={c.klient_id} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{c.nazev}</span>
                        <span className="font-bold">{currency.format(c.total)}</span>
                      </li>
                    ))}
                    {data.topClients.length === 0 && <li className="text-sm text-gray-400">Žádná data</li>}
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase">TOP Pracovníci</h3>
                  <ul className="mt-3 space-y-2">
                    {data.topWorkers.map(w => (
                      <li key={w.pracovnik_id} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{w.jmeno}</span>
                        <span className="font-bold">{w.total.toLocaleString('cs-CZ')} h</span>
                      </li>
                    ))}
                    {data.topWorkers.length === 0 && <li className="text-sm text-gray-400">Žádná data</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {view === 'workers' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <WorkersTable data={detailedStats.workers} />
            </div>
          )}

          {view === 'clients' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ClientsTable data={detailedStats.clients} />
            </div>
          )}
        </>
      )}
    </div>
  );
}