'use client'
import { useState, useEffect, useMemo, Fragment, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDashboardData, getDetailedStats, getExperimentalStats, DashboardData, MonthlyData, WorkerStats, ClientStats, ActionStats, ExperimentalStats, ProjectHealthStats } from '@/lib/dashboard';
import { getMaterialConfig } from '@/lib/material-config';
import { supabase } from '@/lib/supabase';
import { APP_START_YEAR } from '@/lib/config';
import BarChart from '@/components/BarChart';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import ComboBox from '@/components/ComboBox';
import ActiveProjectsTable from '@/components/ActiveProjectsTable';
import CompanyActionsTable from '@/components/CompanyActionsTable';
import ActionDetailModal from '@/components/ActionDetailModal';
import WorkerDetailModal from '@/components/WorkerDetailModal';
import AiChat, { Message } from '@/components/AiChat';

type FilterOption = { id: number; name: string };
// ... (rest of imports)

// ...

const KPICard = ({ title, value, helpText, percentage, percentageColor }: { title: string, value: string, helpText?: string, percentage?: string, percentageColor?: string }) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
      <div className="flex justify-between items-start">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">{title}</p>
        {percentage && <span className={`text-lg font-bold ${percentageColor}`}>{percentage}</span>}
      </div>
      <p className="text-2xl md:text-3xl font-bold mt-2 text-[#333333] dark:text-white">{value}</p>
      {helpText && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{helpText}</p>}
    </div>
  );
};

const DashboardControls = ({ filters, setFilters, workers, clients, divisions, showFilters, period, setPeriod }: any) => {
  const selectedClient = filters.klientId
    ? (clients.find((c: any) => c.id === filters.klientId) || null)
    : null;

  const selectedDivision = filters.divisionId
    ? (divisions.find((d: any) => d.id === filters.divisionId) || null)
    : null;

  const handleClientSelect = (item: { id: number | string, name: string } | null) => {
    if (!item || item.id === '') {
      setFilters({ ...filters, klientId: null });
    } else {
      setFilters({ ...filters, klientId: Number(item.id) });
    }
  };

  const handleDivisionSelect = (item: { id: number | string, name: string } | null) => {
    if (!item || item.id === '') {
      setFilters({ ...filters, divisionId: null });
    } else {
      setFilters({ ...filters, divisionId: Number(item.id) });
    }
  };

  const clientOptions = [{ id: '', name: 'Všichni klienti' }, ...clients];
  const divisionOptions = [{ id: '', name: 'Všechny divize' }, ...divisions];

  const periodOptions = [
    { id: 'last12months', name: 'Posledních 12 měsíců' },
    { id: 'thisYear', name: `Tento rok (${new Date().getFullYear()})` },
    { id: 'lastYear', name: `Minulý rok (${new Date().getFullYear() - 1})` }
  ];

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Přehled
          <span className="ml-2 text-lg font-normal text-gray-500">
            {period === 'last12months' && '(Posledních 12 měsíců)'}
            {period === 'thisYear' && `(Rok ${new Date().getFullYear()})`}
            {period === 'lastYear' && `(Rok ${new Date().getFullYear() - 1})`}
          </span>
        </h1>

        {/* Period Selector */}
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
          {periodOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPeriod(opt.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${period === opt.id
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              {opt.name.split(' (')[0]} {/* Short name for buttons */}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Klient</label>
            <ComboBox
              items={clientOptions}
              selected={selectedClient}
              setSelected={handleClientSelect}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Divize</label>
            <ComboBox
              items={divisionOptions}
              selected={selectedDivision}
              setSelected={handleDivisionSelect}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardKpiGrid = ({ data, selectedMonths }: { data: DashboardData, selectedMonths: MonthlyData[] }) => {
  // Aggregate data if months are selected
  const kpiData = useMemo(() => {
    if (!selectedMonths || selectedMonths.length === 0) return data;

    // Aggregation Logic
    const agg = {
      totalRevenue: 0,
      totalCosts: 0,
      grossProfit: 0,
      materialProfit: 0,
      totalMaterialCost: 0,
      totalLaborCost: 0,
      totalOverheadCost: 0,
      totalHours: 0,
      totalEstimatedHours: 0,
      averageHourlyWage: 0,
      avgCompanyRate: 0,
    };

    selectedMonths.forEach(m => {
      agg.totalRevenue += m.totalRevenue;
      agg.totalCosts += m.totalCosts;
      agg.grossProfit += m.grossProfit;
      agg.materialProfit += m.materialProfit;
      agg.totalMaterialCost += m.totalMaterialCost;
      agg.totalLaborCost += m.totalLaborCost;
      agg.totalOverheadCost += m.totalOverheadCost;
      agg.totalHours += m.totalHours;
      agg.totalEstimatedHours += m.totalEstimatedHours;
    });

    // Recalculate Ratios
    agg.averageHourlyWage = agg.totalHours > 0 ? agg.totalLaborCost / agg.totalHours : 0;
    agg.avgCompanyRate = agg.totalHours > 0 ? (agg.totalRevenue - (agg.totalMaterialCost + agg.materialProfit)) / agg.totalHours : 0; // Approx logic matching Dashboard

    // Note: Dashboard logic for avgCompanyRate is (Revenue - Material) / Hours. 
    // MaterialCost + MaterialProfit = TotalMaterial (Price to client).
    // Let's use the same logic as dashboard.ts: (totalRevenue - totalMaterialKlient) / totalHours
    // But we don't have totalMaterialKlient in agg yet.
    // Let's simpler way: Weighted average? No, simple division of sums is correct for rates.
    // We need totalMaterialKlient to be accurate.
    let totalMaterialKlient = 0;
    selectedMonths.forEach(m => totalMaterialKlient += m.totalMaterialKlient);

    agg.avgCompanyRate = agg.totalHours > 0 ? (agg.totalRevenue - totalMaterialKlient) / agg.totalHours : 0;

    return agg;
  }, [data, selectedMonths]);


  const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

  const titleSuffix = selectedMonths.length > 0
    ? `(${selectedMonths.length === 1 ? selectedMonths[0].month : `${selectedMonths.length} měsíců`}) `
    : '';

  const helpText = selectedMonths.length > 0
    ? `Data za vybrané období: ${selectedMonths.map(m => m.month).join(', ')}`
    : "Data za celé období";

  const costsPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.totalCosts / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;
  const profitPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.grossProfit / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;
  const materialProfitPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.materialProfit / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;

  const materialPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.totalMaterialCost / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;
  const laborPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.totalLaborCost / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;
  const overheadPercentage = kpiData.totalRevenue > 0 ? `${(kpiData.totalOverheadCost / kpiData.totalRevenue * 100).toFixed(0)}%` : `0%`;

  // Hours Ratio
  const hoursRatio = kpiData.totalEstimatedHours > 0
    ? (kpiData.totalHours / kpiData.totalEstimatedHours * 100)
    : 0;
  const hoursData = `${kpiData.totalHours.toLocaleString('cs-CZ')} / ${kpiData.totalEstimatedHours.toLocaleString('cs-CZ')}`;

  return (
    <div className="space-y-6">
      {/* Row 1: Finance (Revenue, Profit) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title={`${titleSuffix}Příjmy`}
          value={currency.format(kpiData.totalRevenue)}
          helpText="Celkové příjmy za fakturace klientům"
        />
        <KPICard
          title={`${titleSuffix}Zisk`}
          value={currency.format(kpiData.grossProfit)}
          helpText="Zisk = Příjmy - Celkové náklady"
          percentage={profitPercentage}
          percentageColor={kpiData.grossProfit >= 0 ? "text-green-500" : "text-red-500"}
        />
        {getMaterialConfig().isVisible && (
          <KPICard
            title={`Zisk (${getMaterialConfig().labelLowercase})`}
            value={currency.format(kpiData.materialProfit)}
            helpText={`Rozdíl mezi fakturací ${getMaterialConfig().labelLowercase}u klientovi a nákupní cenou`}
            percentage={materialProfitPercentage}
            percentageColor={kpiData.materialProfit >= 0 ? "text-green-500" : "text-red-500"}
          />
        )}
      </div>

      {/* Row 2: Costs Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title={`${titleSuffix}Náklady`}
          value={currency.format(kpiData.totalCosts)}
          helpText={`Součet všech nákladů (${getMaterialConfig().isVisible ? getMaterialConfig().label + ' + ' : ''}Mzdy + Režie)`}
          percentage={costsPercentage}
          percentageColor="text-red-500"
        />
        {getMaterialConfig().isVisible && (
          <KPICard
            title={getMaterialConfig().label}
            value={currency.format(kpiData.totalMaterialCost)}
            helpText={`Nákupní cena ${getMaterialConfig().labelLowercase}u`}
            percentage={materialPercentage}
            percentageColor="text-red-500"
          />
        )}
        <KPICard
          title="Mzdy"
          value={currency.format(kpiData.totalLaborCost)}
          helpText="Náklady na vyplacené mzdy pracovníků"
          percentage={laborPercentage}
          percentageColor="text-red-500"
        />
        <KPICard
          title="Režie"
          value={currency.format(kpiData.totalOverheadCost)}
          helpText="Fixní náklady + Ostatní provozní náklady"
          percentage={overheadPercentage}
          percentageColor="text-red-500"
        />
      </div>

      {/* Row 3: Stats & Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Odpracované hodiny"
          value={`${kpiData.totalHours.toLocaleString('cs-CZ')} h`}
          helpText="Celkový počet vykázaných hodin"
        />
        <KPICard
          title="Hodiny (realita / plán)"
          value={hoursData}
          helpText="Poměr odpracovaných hodin vůči odhadu"
          percentage={`${hoursRatio.toFixed(0)}%`}
          percentageColor={hoursRatio <= 100 ? "text-green-500" : "text-red-500"}
        />
        <KPICard
          title="Průměrná hodinová mzda"
          value={currency.format(kpiData.averageHourlyWage) + "/h"}
          helpText="Průměrná vyplacená mzda na hodinu"
        />
        <KPICard
          title="Průměrná sazba firmy"
          value={currency.format(kpiData.avgCompanyRate) + "/h"}
          helpText="Průměrná fakturovaná sazba (Příjmy / Hodiny)"
        />
      </div>
    </div>
  );
};

const WorkersTable = ({ data, onWorkerClick }: { data: WorkerStats[], onWorkerClick: (worker: WorkerStats) => void }) => (
  <>
    {/* Desktop Table View */}
    <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 text-gray-600 dark:text-gray-400">
          <tr>
            <th className="p-4 whitespace-nowrap">Jméno</th>
            <th className="p-4 text-right whitespace-nowrap">Odpracováno</th>
            <th className="p-4 text-right whitespace-nowrap">Vyplaceno (Mzdy)</th>
            <th className="p-4 text-right whitespace-nowrap" title="Na základě alokace nákladů na projekty">Prům. sazba (Alok.)</th>
            <th className="p-4 text-right whitespace-nowrap font-bold text-gray-800 dark:text-gray-200" title="Vyplaceno / Odpracováno celkem">Reálná sazba</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.map(w => (
            <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors" onClick={() => onWorkerClick(w)}>
              <td className="p-4 font-medium text-gray-900 dark:text-white">{w.name}</td>
              <td className="p-4 text-right dark:text-gray-300">{w.totalHours.toLocaleString('cs-CZ')} h</td>
              <td className="p-4 text-right dark:text-gray-300">{w.totalWages.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })}</td>
              <td className="p-4 text-right text-gray-500 dark:text-gray-400">{w.avgHourlyRate.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })}/h</td>
              <td className="p-4 text-right font-bold text-gray-900 dark:text-white">{(w.realHourlyRate || 0).toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })}/h</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Žádná data</td></tr>}
        </tbody>
      </table>
    </div>

    {/* Mobile Card View */}
    <div className="md:hidden space-y-4">
      {data.map(w => (
        <div key={w.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 cursor-pointer active:scale-[0.98] transition-all" onClick={() => onWorkerClick(w)}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{w.name}</h3>
            <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300">
              {w.totalHours.toLocaleString('cs-CZ')} h
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Vyplaceno</p>
              <p className="font-bold text-slate-900 dark:text-white">{w.totalWages.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1 font-semibold">Reálná sazba</p>
              <p className="font-bold text-blue-700 dark:text-blue-300">{(w.realHourlyRate || 0).toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })}/h</p>
            </div>
            <div className="col-span-2 text-center text-xs text-gray-400">
              Sazba (Alokovaná): {w.avgHourlyRate.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })}/h
            </div>
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div className="p-8 text-center text-gray-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
          Žádná data k zobrazení
        </div>
      )}
    </div>
  </>
);

const ClientsTable = ({ data, onActionClick }: { data: ClientStats[], onActionClick: (action: ActionStats) => void }) => {
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
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue, 'cs')
            : bValue.localeCompare(aValue, 'cs');
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
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-b dark:border-slate-700">
            <tr>
              <th className="p-3 whitespace-nowrap w-8"></th>
              <th className="p-3 whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('name')}>
                <div className="flex items-center gap-1">Klient {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              </th>
              <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('totalHours')}>
                <div className="flex items-center justify-end gap-1">Hodiny {sortConfig?.key === 'totalHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              </th>
              <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('revenue')}>
                <div className="flex items-center justify-end gap-1">Příjmy {sortConfig?.key === 'revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              </th>
              {getMaterialConfig().isVisible && (
                <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('materialCost')}>
                  <div className="flex items-center justify-end gap-1">{getMaterialConfig().label} {sortConfig?.key === 'materialCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                </th>
              )}
              <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('laborCost')}>
                <div className="flex items-center justify-end gap-1">Mzdy {sortConfig?.key === 'laborCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              </th>
              <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('overheadCost')}>
                <div className="flex items-center justify-end gap-1">Režie {sortConfig?.key === 'overheadCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              </th>
              <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('totalCost')}>
                <div className="flex items-center justify-end gap-1">Náklady {sortConfig?.key === 'totalCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              </th>
              <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('profit')}>
                <div className="flex items-center justify-end gap-1">Zisk {sortConfig?.key === 'profit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              </th>
              <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('margin')}>
                <div className="flex items-center justify-end gap-1">Marže {sortConfig?.key === 'margin' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedData.map(c => (
              <Fragment key={c.id}>
                <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => toggleClient(c.id)}>
                  <td className="p-3 text-center">
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
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
                  <td className="p-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                  <td className="p-3 text-right font-medium dark:text-gray-200">{c.totalHours.toLocaleString('cs-CZ')} h</td>
                  <td className="p-3 text-right font-medium dark:text-gray-200">{currency(c.revenue)}</td>
                  {getMaterialConfig().isVisible && <td className="p-3 text-right text-gray-600 dark:text-gray-400">{currency(c.materialCost)}</td>}
                  <td className="p-3 text-right text-gray-600 dark:text-gray-400">{currency(c.laborCost)}</td>
                  <td className="p-3 text-right text-gray-600 dark:text-gray-400">{currency(c.overheadCost)}</td>
                  <td className="p-3 text-right text-red-600 dark:text-red-400 font-medium">{currency(c.totalCost)}</td>
                  <td className={`p-3 text-right font-bold ${c.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{currency(c.profit)}</td>
                  <td className={`p-3 text-right ${c.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{c.margin.toFixed(1)}%</td>
                </tr>
                {expandedClients.has(c.id) && (
                  <tr className="bg-gray-50/50 dark:bg-slate-800/30">
                    <td colSpan={10} className="p-0">
                      <div className="py-2 pl-4 pr-4 border-b border-gray-100 dark:border-slate-800 shadow-inner bg-gray-50 dark:bg-slate-900/50">
                        <table className="w-full text-xs">
                          <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                            <tr>
                              <th className="py-2 pl-10 text-left font-medium uppercase tracking-wider">Akce</th>
                              <th className="py-2 text-right font-medium uppercase tracking-wider">Hodiny</th>
                              <th className="py-2 text-right font-medium uppercase tracking-wider">Příjmy</th>
                              {getMaterialConfig().isVisible && <th className="py-2 text-right font-medium uppercase tracking-wider">{getMaterialConfig().label}</th>}
                              <th className="py-2 text-right font-medium uppercase tracking-wider">Mzdy</th>
                              <th className="py-2 text-right font-medium uppercase tracking-wider">Režie</th>
                              <th className="py-2 text-right font-medium uppercase tracking-wider">Náklady</th>
                              <th className="py-2 text-right font-medium uppercase tracking-wider">Zisk</th>
                              <th className="py-2 text-right font-medium uppercase tracking-wider">Marže</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {c.actions.map(action => (
                              <tr key={action.id} className="hover:bg-gray-100/50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors" onClick={() => onActionClick(action)}>
                                <td className="py-2 pl-10 text-gray-700 dark:text-gray-300">
                                  <span className={action.isCompleted ? 'line-through text-gray-400' : ''}>{action.name}</span>
                                </td>
                                <td className="py-2 text-right text-gray-600 dark:text-gray-400">{action.totalHours.toLocaleString('cs-CZ')} h</td>
                                <td className="py-2 text-right text-gray-600 dark:text-gray-400">{currency(action.revenue)}</td>
                                {getMaterialConfig().isVisible && <td className="py-2 text-right text-gray-500 dark:text-gray-500">{currency(action.materialCost)}</td>}
                                <td className="py-2 text-right text-gray-500 dark:text-gray-500">{currency(action.laborCost)}</td>
                                <td className="py-2 text-right text-gray-500 dark:text-gray-500">{currency(action.overheadCost)}</td>
                                <td className="py-2 text-right text-red-500 dark:text-red-400">{currency(action.totalCost)}</td>
                                <td className={`py-2 text-right font-medium ${action.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{currency(action.profit)}</td>
                                <td className={`py-2 text-right ${action.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{action.margin.toFixed(1)}%</td>
                              </tr>
                            ))}
                            {c.actions.length === 0 && (
                              <tr>
                                <td colSpan={9} className="py-4 text-center text-gray-400 italic">Žádné akce pro toto období</td>
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
            {sortedData.length === 0 && <tr><td colSpan={10} className="p-4 text-center text-gray-500">Žádná data</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {/* Mobile sort options could go here */}
        {sortedData.map(c => {
          const isExpanded = expandedClients.has(c.id);
          return (
            <div key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
              <div onClick={() => toggleClient(c.id)} className="flex justify-between items-start mb-4 cursor-pointer">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    {c.name}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{c.totalHours.toLocaleString('cs-CZ')} hod</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${c.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {currency(c.profit)}
                  </p>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Zisk</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Příjmy</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{currency(c.revenue)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Náklady Celkem</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">{currency(c.totalCost)}</p>
                </div>
              </div>

              {isExpanded && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/30 p-4 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b border-gray-200 dark:border-slate-700 pb-2">Rozpad Nákladů</h4>
                  <div className="space-y-2 text-sm mb-4">
                    {getMaterialConfig().isVisible && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{getMaterialConfig().label}:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-200">{currency(c.materialCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Mzdy:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">{currency(c.laborCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Režie:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">{currency(c.overheadCost)}</span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b border-gray-200 dark:border-slate-700 pb-2">Akce ({c.actions.length})</h4>
                  <div className="space-y-3">
                    {c.actions.map(action => (
                      <div key={action.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer active:scale-[0.99] transition-all" onClick={() => onActionClick(action)}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`font-semibold text-sm ${action.isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-200'}`}>{action.name}</span>
                          <span className={`${action.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-bold text-sm`}>{currency(action.profit)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{action.totalHours.toLocaleString('cs-CZ')} hod</span>
                          <span>Marže: {action.margin.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                    {c.actions.length === 0 && <p className="text-xs text-gray-400 italic text-center">Žádné akce</p>}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-sm text-gray-500">Marže</span>
                <span className={`font-bold ${c.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {c.margin.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
        {sortedData.length === 0 && (
          <div className="p-8 text-center text-gray-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
            Žádná data k zobrazení
          </div>
        )}
      </div>
    </>
  );
};






function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Default to 'firma' if no tab param is present
  const currentTab = (searchParams.get('tab') as 'firma' | 'workers' | 'clients' | 'experimental' | 'ai') || 'firma';

  const [view, setView] = useState<'firma' | 'workers' | 'clients' | 'experimental' | 'ai'>(currentTab);

  // Sync state with URL changes
  useEffect(() => {
    setView(currentTab);
  }, [currentTab]);

  // Update URL manually if needed
  const handleSetView = (newView: 'firma' | 'workers' | 'clients' | 'experimental' | 'ai') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newView);
    router.push(`/dashboard?${params.toString()}`);
  }

  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Dashboard State
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [detailedStats, setDetailedStats] = useState<{ workers: WorkerStats[], clients: ClientStats[] } | null>(null);
  const [experimentalData, setExperimentalData] = useState<ExperimentalStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [period, setPeriod] = useState<string>('last12months');
  const [filters, setFilters] = useState<{ pracovnikId?: number | null, klientId?: number | null, divisionId?: number | null }>({});
  const [workers, setWorkers] = useState<FilterOption[]>([]);
  const [clients, setClients] = useState<FilterOption[]>([]);
  const [divisions, setDivisions] = useState<FilterOption[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<MonthlyData[]>([]);
  const [selectedAction, setSelectedAction] = useState<ActionStats | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerStats | null>(null);

  // Load selected period from URL or default to current year
  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month?: number } | 'last12months'>('last12months');

  useEffect(() => {
    async function loadFilters() {
      const { data: workerData } = await supabase.from('pracovnici').select('id, jmeno').order('jmeno');
      const { data: clientData } = await supabase.from('klienti').select('id, nazev').order('nazev');
      const { data: divisionData } = await supabase.from('divisions').select('id, nazev').order('nazev');

      setWorkers(workerData?.map(w => ({ id: w.id, name: w.jmeno })) || []);
      setClients(clientData?.map(c => ({ id: c.id, name: c.nazev })) || []);
      setDivisions(divisionData?.map(d => ({ id: d.id, name: d.nazev })) || []);
    }
    loadFilters();
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      let periodParam: 'last12months' | { year: number; month?: number };
      if (period === 'thisYear') {
        periodParam = { year: new Date().getFullYear() };
      } else if (period === 'lastYear') {
        periodParam = { year: new Date().getFullYear() - 1 };
      } else {
        periodParam = 'last12months';
      }

      const [dashboardData, stats, expStats] = await Promise.all([
        getDashboardData(periodParam, filters),
        getDetailedStats(periodParam, filters),
        getExperimentalStats(filters)
      ]);

      setData(dashboardData);
      setDetailedStats(stats);
      setExperimentalData(expStats);

      setSelectedMonths([]);
      setLoading(false);
    }
    loadDashboard();
  }, [filters, period]);

  const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), []);

  const handleMonthClick = (monthData: MonthlyData, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      // Toggle
      const exists = selectedMonths.some(m => m.month === monthData.month && m.year === monthData.year);
      if (exists) {
        setSelectedMonths(selectedMonths.filter(m => !(m.month === monthData.month && m.year === monthData.year)));
      } else {
        setSelectedMonths([...selectedMonths, monthData]);
      }
    } else {
      // Single Select Logic
      if (selectedMonths.length === 1 && selectedMonths[0].month === monthData.month && selectedMonths[0].year === monthData.year) {
        // Deselect if clicking the same single selected month
        setSelectedMonths([]);
      } else {
        // Replace selection
        setSelectedMonths([monthData]);
      }
    }
  };

  // Helper to aggregate top lists filter
  const aggregatedTopClients = useMemo(() => {
    if (selectedMonths.length === 0) return data?.topClients || [];

    const map = new Map<number, { klient_id: number; nazev: string; total: number }>();
    selectedMonths.forEach(m => {
      m.topClients.forEach(c => {
        const curr = map.get(c.klient_id) || { klient_id: c.klient_id, nazev: c.nazev, total: 0 };
        curr.total += c.total;
        map.set(c.klient_id, curr);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [data, selectedMonths]);

  const aggregatedTopWorkers = useMemo(() => {
    if (selectedMonths.length === 0) return data?.topWorkers || [];

    const map = new Map<number, { pracovnik_id: number; jmeno: string; total: number }>();
    selectedMonths.forEach(m => {
      m.topWorkers.forEach(w => {
        const curr = map.get(w.pracovnik_id) || { pracovnik_id: w.pracovnik_id, jmeno: w.jmeno, total: 0 };
        curr.total += w.total;
        map.set(w.pracovnik_id, curr);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [data, selectedMonths]);

  return (
    <div className="w-full px-4 md:px-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-black dark:text-white">
          {view === 'firma' && 'Přehled firmy'}
          {view === 'workers' && 'Produktivita zaměstnanců'}
          {view === 'clients' && 'Přehled klientů'}
          {view === 'experimental' && 'Experimentální přehled'}
          {view === 'ai' && 'AI Asistent'}
        </h2>
      </div>

      {/* Filters (Desktop) */}
      {!['experimental', 'ai'].includes(view) && (
        <div className="hidden md:block">
          <DashboardControls
            filters={filters} setFilters={setFilters}
            workers={workers} clients={clients} divisions={divisions}
            showFilters={view === 'firma'}
            period={period} setPeriod={setPeriod}
          />
        </div>
      )}

      {view === 'experimental' && experimentalData && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="p-4 bg-indigo-50 dark:bg-slate-900/50 border border-indigo-100 dark:border-slate-800 rounded-xl text-indigo-800 dark:text-indigo-400 text-sm mb-6 flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div>
              <strong>Experimentální pohled:</strong> Tato sekce zobrazuje data pouze pro <u>neukončené</u> (běžící) akce a slouží pro operativní řízení.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="Hodnota Rozpracovanosti (WIP)"
              value={currency.format(experimentalData.totalWipValue)}
              helpText="Náklady (Práce + Materiál) v běžících projektech"
            />
            <KPICard
              title="Potenciál Příjmů"
              value={currency.format(experimentalData.totalRevenuePotential)}
              helpText="Smluvní cena všech běžících projektů"
            />
            <KPICard
              title="Rizikové Projekty"
              value={String(experimentalData.projectsAtRisk)}
              helpText="Projekty s čerpáním rozpočtu > 85%"
              percentage={experimentalData.projectsAtRisk > 0 ? "Pozor" : "OK"}
              percentageColor={experimentalData.projectsAtRisk > 0 ? "text-red-500" : "text-green-500"}
            />
          </div>

          <h3 className="text-lg font-bold text-gray-800 dark:text-white mt-8 mb-4">Detail Projektů (Běžící)</h3>
          <ActiveProjectsTable data={experimentalData.activeProjects} />
        </div>
      )}

      {loading || !data || !detailedStats || (view === 'experimental' && !experimentalData) ? (
        <DashboardSkeleton view={view} />
      ) : (
        <>
          {view === 'firma' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-6">
                <BarChart
                  data={data.monthlyData}
                  onMonthClick={handleMonthClick}
                  selectedMonths={selectedMonths}
                />
                <DashboardKpiGrid data={data} selectedMonths={selectedMonths} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">TOP Klienti {selectedMonths.length > 0 ? '(Vybrané období)' : ''}</h3>
                  <ul className="mt-3 space-y-2">
                    {aggregatedTopClients.map(c => (
                      <li key={c.klient_id} className="flex justify-between items-center text-sm">
                        <span className="font-medium dark:text-white">{c.nazev}</span>
                        <span className="font-bold dark:text-gray-200">{currency.format(c.total)}</span>
                      </li>
                    ))}
                    {aggregatedTopClients.length === 0 && <li className="text-sm text-gray-400">Žádná data</li>}
                  </ul>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">TOP Pracovníci {selectedMonths.length > 0 ? '(Vybrané období)' : ''}</h3>
                  <ul className="mt-3 space-y-2">
                    {aggregatedTopWorkers.map(w => (
                      <li key={w.pracovnik_id} className="flex justify-between items-center text-sm">
                        <span className="font-medium dark:text-white">{w.jmeno}</span>
                        <span className="font-bold dark:text-gray-200">{w.total.toLocaleString('cs-CZ')} h</span>
                      </li>
                    ))}
                    {aggregatedTopWorkers.length === 0 && <li className="text-sm text-gray-400">Žádná data</li>}
                  </ul>
                </div>
              </div>

              {/* Company Actions Table (Flattened View) */}
              <div className="mt-8">
                <CompanyActionsTable
                  data={
                    (detailedStats?.clients.flatMap(c => c.actions) || []).filter(a => {
                      if (selectedMonths.length === 0) return true;

                      const matches = selectedMonths.some(m => {
                        const key = `${m.year}-${m.monthIndex}`;
                        return a.activeMonths?.includes(key);
                      });

                      return matches;
                    })
                  }
                  onActionClick={setSelectedAction}
                />
              </div>
            </div>
          )}

          <ActionDetailModal
            action={selectedAction}
            onClose={() => setSelectedAction(null)}
          />


          {view === 'workers' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <WorkersTable data={detailedStats.workers} onWorkerClick={setSelectedWorker} />
            </div>
          )}

          <WorkerDetailModal
            worker={selectedWorker}
            onClose={() => setSelectedWorker(null)}
          />

          {view === 'clients' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ClientsTable data={detailedStats.clients} onActionClick={setSelectedAction} />
            </div>
          )}

          {view === 'ai' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AiChat
                messages={aiMessages}
                setMessages={setAiMessages}
                className="h-[calc(100vh-140px)]"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Fragment>
      <div className="relative">
        <Suspense fallback={<DashboardSkeleton view="firma" />}>
          <DashboardContent />
        </Suspense>
      </div>
    </Fragment>
  );
}