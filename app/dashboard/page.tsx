'use client'
import { useState, useEffect, useMemo } from 'react';
import { getDashboardData, DashboardData, MonthlyData } from '@/lib/dashboard';
import { supabase } from '@/lib/supabase';
import BarChart from '@/components/BarChart';

type FilterOption = { id: number; name: string };

const KPICard = ({ title, value, helpText, percentage, percentageColor }: { title: string, value: string, helpText?: string, percentage?: string, percentageColor?: string }) => {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80">
        <div className="flex justify-between items-start">
          <p className="text-sm font-semibold text-gray-500 uppercase">{title}</p>
          {percentage && <span className={`text-lg font-bold ${percentageColor}`}>{percentage}</span>}
        </div>
        <p className="text-4xl font-bold mt-2 text-[#333333]">{value}</p>
        {helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>}
      </div>
    );
  };

const DashboardControls = ({ period, setPeriod, filters, setFilters, workers, clients, year, setYear, availableYears }: any) => (
  <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
    {/* Time Period Tabs */}
    <div className="p-1 bg-gray-100 rounded-full flex items-center">
      {(['last12months', 'year'] as const).map(p => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`px-6 py-2 rounded-full text-sm font-semibold transition-all w-full ${period === p ? 'bg-white shadow' : 'text-gray-600 hover:bg-white/60'}`}
        >
          {p === 'last12months' ? 'Posl. 12 měsíců' : 'Roční přehled'}
        </button>
      ))}
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {period === 'year' && (
            <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full rounded-lg bg-white border-slate-300 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30"
            >
                {availableYears.map((y: number) => <option key={y} value={y}>{y}</option>)}
            </select>
        )}
        <select
            value={filters.pracovnikId || ''}
            onChange={e => setFilters({ ...filters, pracovnikId: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-lg bg-white border-slate-300 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 sm:col-span-1"
        >
            <option value="">Všichni pracovníci</option>
            {workers.map((w: FilterOption) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select
            value={filters.klientId || ''}
            onChange={e => setFilters({ ...filters, klientId: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-lg bg-white border-slate-300 p-3 transition focus:border-[#E30613] focus:ring-2 focus:ring-[#E30613]/30 sm:col-span-1"
        >
            <option value="">Všichni klienti</option>
            {clients.map((c: FilterOption) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
    </div>
  </div>
);


const AdditionalKpis = ({ data, currency }: { data: DashboardData, currency: Intl.NumberFormat }) => (
    <>
      <KPICard title="Odpracované hodiny" value={data.totalHours.toLocaleString('cs-CZ') + ' h'} />
      <KPICard title="Prům. Sazba Firmy" value={currency.format(data.avgCompanyRate) + '/h'} />
      <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80">
        <p className="text-sm font-semibold text-gray-500 uppercase">PRŮM. HODINOVÁ MZDA</p>
        <p className="text-4xl font-bold mt-2 text-[#333333]">{currency.format(data.averageHourlyWage)}<span className="text-2xl text-gray-400">/h</span></p>
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'last12months' | 'year'>('last12months');
  const [year, setYear] = useState(new Date().getFullYear());
  const [filters, setFilters] = useState<{ pracovnikId?: number | null, klientId?: number | null }>({});
  
  const [workers, setWorkers] = useState<FilterOption[]>([]);
  const [clients, setClients] = useState<FilterOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyData | null>(null);
  
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
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
      const periodParam = period === 'year' ? { year } : period;
      const dashboardData = await getDashboardData(periodParam, filters);
      setData(dashboardData);
      setSelectedMonth(null); // Reset month selection on period change
      setLoading(false);
    }
    loadDashboard();
  }, [period, filters, year]);

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

    // Gross profit for monthly data is pre-calculated. For total data, it's also available.
    const grossProfit = 'grossProfit' in d ? d.grossProfit : (d.totalRevenue - d.totalCosts);
    const materialProfit = 'materialProfit' in d ? d.materialProfit : 0;

    const costsPercentage = d.totalRevenue > 0 ? `${(d.totalCosts / d.totalRevenue * 100).toFixed(0)}%` : `0%`;
    const profitPercentage = d.totalRevenue > 0 ? `${(grossProfit / d.totalRevenue * 100).toFixed(0)}%` : `0%`;
    const materialProfitPercentage = d.totalRevenue > 0 ? `${(materialProfit / d.totalRevenue * 100).toFixed(0)}%` : `0%`;
    
    let helpText: string;
    let titleSuffix: string = '';
    if (selectedMonth) {
        helpText = `Data za ${selectedMonth.month} ${selectedMonth.year}`;
    } else if (period === 'last12months') {
        helpText = "Za posledních 12 měsíců";
        titleSuffix = 'Celkové '
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
    <div className="max-w-7xl mx-auto w-full">
      <h2 className="text-3xl font-bold mb-6 text-black">Dashboard</h2>
      
      <DashboardControls 
        period={period} setPeriod={setPeriod} 
        filters={filters} setFilters={setFilters} 
        workers={workers} clients={clients}
        year={year} setYear={setYear} availableYears={availableYears}
      />

      {loading || !data ? (
        <div className="text-center p-12">Načítám data dashboardu...</div>
      ) : (
        <>
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

          {/* Aggregated Lists are always visible */}
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
        </>
      )}
    </div>
  );
}
