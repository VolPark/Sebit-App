'use client'
import { useState, useEffect, useMemo, Fragment, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDashboardData, getDetailedStats, getExperimentalStats, DashboardData, MonthlyData, WorkerStats, ClientStats, ActionStats, ExperimentalStats } from '@/lib/dashboard';
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
import { useAuth } from '@/context/AuthContext';
import BetaFirmaView from '@/components/dashboard/BetaFirmaView';
import BetaToggle from '@/components/dashboard/BetaToggle';
// Extracted components
import { KPICard } from '@/components/ui/KPICard';
import { DashboardKpiGrid } from '@/components/dashboard/DashboardKpiGrid';
import { WorkersTable } from '@/components/dashboard/WorkersTable';
import { ClientsTable } from '@/components/dashboard/ClientsTable';

type FilterOption = { id: number; name: string };

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

function DashboardContent() {
  const searchParams = useSearchParams();
  // Default to 'firma' if no tab param is present
  const currentTab = (searchParams.get('tab') as 'firma' | 'workers' | 'clients' | 'experimental' | 'ai') || 'firma';

  const [view, setView] = useState<'firma' | 'workers' | 'clients' | 'experimental' | 'ai'>(currentTab);

  // Sync state with URL changes
  useEffect(() => {
    setView(currentTab);
  }, [currentTab]);

// Dashboard State
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [detailedStats, setDetailedStats] = useState<{ workers: WorkerStats[], clients: ClientStats[] } | null>(null);
  const [experimentalData, setExperimentalData] = useState<ExperimentalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [period, setPeriod] = useState<string>('last12months');
  const [filters, setFilters] = useState<{ pracovnikId?: number | null, klientId?: number | null, divisionId?: number | null }>({});
  const [workers, setWorkers] = useState<FilterOption[]>([]);
  const [clients, setClients] = useState<FilterOption[]>([]);
  const [divisions, setDivisions] = useState<FilterOption[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<MonthlyData[]>([]);
  const [selectedAction, setSelectedAction] = useState<ActionStats | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerStats | null>(null);

  // Beta mode state with localStorage persistence
  const { role } = useAuth();
  const [betaMode, setBetaMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboard_beta_mode');
      // Default to true if not set, otherwise respect stored preference
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('dashboard_beta_mode', String(betaMode));
  }, [betaMode]);

  useEffect(() => {
    async function loadFilters() {
      try {
        const { data: workerData, error: workerError } = await supabase.from('pracovnici').select('id, jmeno').order('jmeno');
        const { data: clientData, error: clientError } = await supabase.from('klienti').select('id, nazev').order('nazev');
        const { data: divisionData, error: divisionError } = await supabase.from('divisions').select('id, nazev').order('nazev');

        if (workerError || clientError || divisionError) {
          console.error('Filter loading error:', workerError || clientError || divisionError);
        }

        setWorkers(workerData?.map(w => ({ id: w.id, name: w.jmeno })) || []);
        setClients(clientData?.map(c => ({ id: c.id, name: c.nazev })) || []);
        setDivisions(divisionData?.map(d => ({ id: d.id, name: d.nazev })) || []);
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
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
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError('Nepodařilo se načíst dashboard. Zkuste to prosím znovu.');
      } finally {
        setLoading(false);
      }
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
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-black dark:text-white">
            {view === 'firma' && 'Přehled firmy'}
            {view === 'workers' && 'Produktivita zaměstnanců'}
            {view === 'clients' && 'Přehled klientů'}
            {view === 'experimental' && 'Experimentální přehled'}
            {view === 'ai' && 'AI Asistent'}
          </h2>
          {view === 'firma' && (role === 'admin' || role === 'owner') && (
            <BetaToggle enabled={betaMode} onChange={setBetaMode} />
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 text-sm font-medium bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 rounded-lg transition-colors"
          >
            Zkusit znovu
          </button>
        </div>
      )}

      {/* Filters (Desktop) - hidden when beta mode is on for firma view */}
      {!['experimental', 'ai'].includes(view) && !(betaMode && view === 'firma') && (
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
          {view === 'firma' && betaMode ? (
            <BetaFirmaView onActionClick={setSelectedAction} />
          ) : view === 'firma' && (
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