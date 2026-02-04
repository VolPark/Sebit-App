'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDashboardData, getDetailedStats, getExperimentalStats } from '@/lib/dashboard';
import type { DashboardData, MonthlyData, WorkerStats, ClientStats, ActionStats, ExperimentalStats } from '@/lib/dashboard';
import { supabase } from '@/lib/supabase';
import BarChart from '@/components/BarChart';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import CompanyActionsTable from '@/components/CompanyActionsTable';
import ActiveProjectsTable from '@/components/ActiveProjectsTable';
import ActionDetailModal from '@/components/ActionDetailModal';
import WorkerDetailModal from '@/components/WorkerDetailModal';
import { getMaterialConfig } from '@/lib/material-config';
import { formatRate } from '@/lib/formatting';
import ComboBox from '@/components/ComboBox';

type FilterOption = { id: number; name: string };

// Simplified KPI Card component
const KPICard = ({ title, value, helpText, percentage, percentageColor }: {
    title: string;
    value: string;
    helpText?: string;
    percentage?: string;
    percentageColor?: string;
}) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
        <div className="flex justify-between items-start">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">{title}</p>
            {percentage && <span className={`text-lg font-bold ${percentageColor}`}>{percentage}</span>}
        </div>
        <p className="text-2xl md:text-3xl font-bold mt-2 text-[#333333] dark:text-white">{value}</p>
        {helpText && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{helpText}</p>}
    </div>
);

interface DashboardBetaClientProps {
    initialData: DashboardData;
    initialDetailedStats: { workers: WorkerStats[]; clients: ClientStats[] };
    initialExperimentalData: ExperimentalStats;
}

export default function DashboardBetaClient({ initialData, initialDetailedStats, initialExperimentalData }: DashboardBetaClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [data, setData] = useState<DashboardData>(initialData);
    const [detailedStats, setDetailedStats] = useState(initialDetailedStats);
    const [experimentalData, setExperimentalData] = useState(initialExperimentalData);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<string | number>('last12months');
    const [filters, setFilters] = useState<{ pracovnikId?: number | null; klientId?: number | null; divisionId?: number | null }>({});
    const [clients, setClients] = useState<FilterOption[]>([]);
    const [divisions, setDivisions] = useState<FilterOption[]>([]);
    const [selectedMonths, setSelectedMonths] = useState<MonthlyData[]>([]);
    const [selectedAction, setSelectedAction] = useState<ActionStats | null>(null);
    const [selectedWorker, setSelectedWorker] = useState<WorkerStats | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const currentTab = (searchParams.get('tab') as 'firma' | 'workers' | 'clients' | 'experimental') || 'firma';
    const [view, setView] = useState(currentTab);

    const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), []);

    // Load filter options from Supabase
    useEffect(() => {
        async function loadFilters() {
            const { data: clientData } = await supabase.from('klienti').select('id, nazev').order('nazev');
            const { data: divisionData } = await supabase.from('divisions').select('id, nazev').order('nazev');

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
            } else if (typeof period === 'number') {
                // Individual year selected
                periodParam = { year: period };
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

    // Filter handlers
    const selectedClient = filters.klientId
        ? (clients.find(c => c.id === filters.klientId) || null)
        : null;

    const selectedDivision = filters.divisionId
        ? (divisions.find(d => d.id === filters.divisionId) || null)
        : null;

    const handleClientSelect = (item: { id: number | string; name: string } | null) => {
        if (!item || item.id === '') {
            setFilters({ ...filters, klientId: null });
        } else {
            setFilters({ ...filters, klientId: Number(item.id) });
        }
    };

    const handleDivisionSelect = (item: { id: number | string; name: string } | null) => {
        if (!item || item.id === '') {
            setFilters({ ...filters, divisionId: null });
        } else {
            setFilters({ ...filters, divisionId: Number(item.id) });
        }
    };

    const clientOptions = [{ id: '', name: 'Všichni klienti' }, ...clients];
    const divisionOptions = [{ id: '', name: 'Všechny divize' }, ...divisions];

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
            m.topWorkers?.forEach(w => {
                const curr = map.get(w.pracovnik_id) || { pracovnik_id: w.pracovnik_id, jmeno: w.jmeno, total: 0 };
                curr.total += w.total;
                map.set(w.pracovnik_id, curr);
            });
        });
        return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
    }, [data, selectedMonths]);

    // Generate available years from APP_START_YEAR to current year
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const APP_START_YEAR = 2025; // From lib/config.ts
        const years = [];
        for (let year = currentYear; year >= APP_START_YEAR; year--) {
            years.push(year);
        }
        return years;
    }, []);

    const getPeriodLabel = () => {
        if (period === 'last12months') return 'Posledních 12 měsíců';
        if (period === 'thisYear') return `Rok ${new Date().getFullYear()}`;
        if (period === 'lastYear') return `Rok ${new Date().getFullYear() - 1}`;
        // Individual year selected
        return `Rok ${period}`;
    };

    return (
        <div className="w-full px-4 md:px-6 mx-auto">
            <div className="mb-4 p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg flex items-center gap-3">
                <div className="px-3 py-1 bg-white/20 rounded-lg font-bold text-sm backdrop-blur-sm">BETA</div>
                <div className="flex-1">
                    <p className="font-semibold">Beta verze dashboardu</p>
                    <p className="text-xs opacity-90">Refaktorovaná architektura dle best practices - pro administrátory</p>
                </div>
            </div>

            {/* Period Selector */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Přehled
                    <span className="ml-2 text-lg font-normal text-gray-500">
                        ({getPeriodLabel()})
                    </span>
                </h1>

                <div className="flex gap-2 items-center">
                    {/* Quick period buttons */}
                    <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setPeriod('last12months')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${period === 'last12months'
                                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            12 měsíců
                        </button>
                        <button
                            onClick={() => setPeriod('thisYear')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${period === 'thisYear'
                                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            Tento rok
                        </button>
                        <button
                            onClick={() => setPeriod('lastYear')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${period === 'lastYear'
                                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            Minulý rok
                        </button>
                    </div>

                    {/* Year dropdown */}
                    <select
                        value={typeof period === 'number' ? period : ''}
                        onChange={(e) => setPeriod(Number(e.target.value))}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
                    >
                        <option value="">Vybrat rok...</option>
                        {availableYears.map(year => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Filter Toggle & Controls */}
            <div className="mb-4">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                    {showFilters ? '▼' : '▶'} Filtry (Klient, Divize)
                </button>

                {showFilters && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
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

            {loading ? (
                <DashboardSkeleton view={view} />
            ) : (
                <div className="space-y-6">
                    {/* Row 1: Revenue & Profit */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <KPICard
                            title="Příjmy"
                            value={currency.format(data.totalRevenue)}
                            helpText="Celkové příjmy za fakturace klientům"
                        />
                        <KPICard
                            title="Zisk"
                            value={currency.format(data.grossProfit)}
                            helpText="Zisk = Příjmy - Celkové náklady"
                            percentage={data.totalRevenue > 0 ? `${((data.grossProfit / data.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                            percentageColor={data.grossProfit >= 0 ? "text-green-500" : "text-red-500"}
                        />
                        {getMaterialConfig().isVisible && (
                            <KPICard
                                title={`Zisk (${getMaterialConfig().labelLowercase})`}
                                value={currency.format(data.materialProfit)}
                                helpText={`Rozdíl mezi fakturací ${getMaterialConfig().labelLowercase}u klientovi a nákupní cenou`}
                                percentage={data.totalRevenue > 0 ? `${((data.materialProfit / data.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                                percentageColor={data.materialProfit >= 0 ? "text-green-500" : "text-red-500"}
                            />
                        )}
                    </div>

                    {/* Row 2: Cost Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard
                            title="Náklady"
                            value={currency.format(data.totalCosts)}
                            helpText={`Součet všech nákladů (${getMaterialConfig().isVisible ? getMaterialConfig().label + ' + ' : ''}Mzdy + Režie)`}
                            percentage={data.totalRevenue > 0 ? `${((data.totalCosts / data.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                            percentageColor="text-red-500"
                        />
                        {getMaterialConfig().isVisible && (
                            <KPICard
                                title={getMaterialConfig().label}
                                value={currency.format(data.totalMaterialCost)}
                                helpText={`Nákupní cena ${getMaterialConfig().labelLowercase}u`}
                                percentage={data.totalRevenue > 0 ? `${((data.totalMaterialCost / data.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                                percentageColor="text-red-500"
                            />
                        )}
                        <KPICard
                            title="Mzdy"
                            value={currency.format(data.totalLaborCost)}
                            helpText="Náklady na vyplacené mzdy pracovníků"
                            percentage={data.totalRevenue > 0 ? `${((data.totalLaborCost / data.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                            percentageColor="text-red-500"
                        />
                        <KPICard
                            title="Režie"
                            value={currency.format(data.totalOverheadCost)}
                            helpText="Fixní náklady + Ostatní provozní náklady"
                            percentage={data.totalRevenue > 0 ? `${((data.totalOverheadCost / data.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                            percentageColor="text-red-500"
                        />
                    </div>

                    {/* Row 3: Hours & Rates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard
                            title="Odpracované hodiny"
                            value={`${data.totalHours.toLocaleString('cs-CZ')} h`}
                            helpText="Celkový počet vykázaných hodin"
                        />
                        <KPICard
                            title="Hodiny (realita / plán)"
                            value={`${data.totalHours.toLocaleString('cs-CZ')} / ${data.totalEstimatedHours.toLocaleString('cs-CZ')}`}
                            helpText="Poměr odpracovaných hodin vůči odhadu"
                            percentage={data.totalEstimatedHours > 0 ? `${((data.totalHours / data.totalEstimatedHours) * 100).toFixed(0)}%` : '0%'}
                            percentageColor={data.totalEstimatedHours > 0 && (data.totalHours / data.totalEstimatedHours) <= 1 ? "text-green-500" : "text-red-500"}
                        />
                        <KPICard
                            title="Průměrná hodinová mzda"
                            value={formatRate(data.averageHourlyWage)}
                            helpText="Průměrná vyplacená mzda"
                        />
                        <KPICard
                            title="Průměrná sazba firmy"
                            value={formatRate(data.avgCompanyRate)}
                            helpText="Průměrná fakturovaná sazba (Příjmy / Hodiny)"
                        />
                    </div>

                    <BarChart data={data.monthlyData} onMonthClick={() => { }} selectedMonths={selectedMonths} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">TOP Klienti</h3>
                            <ul className="mt-3 space-y-2">
                                {aggregatedTopClients.map(c => (
                                    <li key={c.klient_id} className="flex justify-between items-center text-sm">
                                        <span className="font-medium dark:text-white">{c.nazev}</span>
                                        <span className="font-bold dark:text-gray-200">{currency.format(c.total)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">TOP Pracovníci (Hodiny)</h3>
                            <ul className="mt-3 space-y-2">
                                {aggregatedTopWorkers.map(w => (
                                    <li key={w.pracovnik_id} className="flex justify-between items-center text-sm">
                                        <span className="font-medium dark:text-white">{w.jmeno}</span>
                                        <span className="font-bold dark:text-gray-200">{w.total.toLocaleString('cs-CZ')} h</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <CompanyActionsTable
                        data={detailedStats.clients.flatMap(c => c.actions)}
                        onActionClick={setSelectedAction}
                    />
                </div>
            )}

            <ActionDetailModal
                action={selectedAction}
                onClose={() => setSelectedAction(null)}
            />
            <WorkerDetailModal
                worker={selectedWorker}
                onClose={() => setSelectedWorker(null)}
            />
        </div>
    );
}
