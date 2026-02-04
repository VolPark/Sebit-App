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
    const [selectedMonths, setSelectedMonths] = useState<MonthlyData[]>([]);
    const [selectedAction, setSelectedAction] = useState<ActionStats | null>(null);
    const [selectedWorker, setSelectedWorker] = useState<WorkerStats | null>(null);

    const currentTab = (searchParams.get('tab') as 'firma' | 'workers' | 'clients' | 'experimental') || 'firma';
    const [view, setView] = useState(currentTab);

    const currency = useMemo(() => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }), []);

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



            {loading ? (
                <DashboardSkeleton view={view} />
            ) : (
                <div className="space-y-6">
                    {/* Monthly Trend Chart - First for context */}
                    <BarChart data={data.monthlyData} onMonthClick={() => { }} selectedMonths={selectedMonths} />

                    {/* Hero Metrics Row */}
                    <div className={`grid grid-cols-1 ${getMaterialConfig().isVisible ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
                        {/* Příjmy - Hero Card */}
                        <KPICard
                            title="Příjmy"
                            value={currency.format(data.totalRevenue)}
                            helpText="Celkové příjmy"
                        />

                        {/* Zisk - Hero Card */}
                        <KPICard
                            title="Zisk"
                            value={currency.format(data.grossProfit)}
                            helpText="Příjmy - Náklady"
                            percentage={data.totalRevenue > 0 ? `${((data.grossProfit / data.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                            percentageColor={data.grossProfit >= 0 ? "text-green-500" : "text-red-500"}
                        />

                        {/* Zisk na materiálu - Hero Card (conditional) */}
                        {getMaterialConfig().isVisible && (
                            <KPICard
                                title={`Zisk (${getMaterialConfig().labelLowercase})`}
                                value={currency.format(data.materialProfit)}
                                helpText={`Marže na ${getMaterialConfig().labelLowercase}u`}
                                percentage={data.totalRevenue > 0 ? `${((data.materialProfit / data.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                                percentageColor={data.materialProfit >= 0 ? "text-green-500" : "text-red-500"}
                            />
                        )}

                        {/* Profit Margin - Hero Card */}
                        <KPICard
                            title="Profit Margin"
                            value={data.totalRevenue > 0 ? `${((data.grossProfit / data.totalRevenue) * 100).toFixed(1)}%` : '0%'}
                            helpText="Zisková marže"
                            percentageColor={data.grossProfit >= 0 ? "text-green-500" : "text-red-500"}
                        />
                    </div>

                    {/* Consolidated Cost Breakdown & Productivity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Consolidated Cost Breakdown Card */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Náklady</p>
                                    <p className="text-3xl font-bold mt-1 text-[#333333] dark:text-white">{currency.format(data.totalCosts)}</p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                        {getMaterialConfig().isVisible ? `${getMaterialConfig().label} + Mzdy + Režie` : 'Mzdy + Režie'}
                                    </p>
                                </div>
                                <span className="text-lg font-bold text-red-500">
                                    {data.totalRevenue > 0 ? `${((data.totalCosts / data.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                                </span>
                            </div>

                            <div className="space-y-3 mt-4">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Rozpad nákladů</p>

                                {/* Material Cost Bar (conditional) */}
                                {getMaterialConfig().isVisible && data.totalCosts > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-300">{getMaterialConfig().label}</span>
                                            <span className="font-semibold dark:text-white">
                                                {currency.format(data.totalMaterialCost)}
                                                <span className="ml-2 text-xs text-gray-400">
                                                    {((data.totalMaterialCost / data.totalCosts) * 100).toFixed(0)}%
                                                </span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div
                                                className="bg-purple-500 h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min((data.totalMaterialCost / data.totalCosts) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Labor Cost Bar */}
                                {data.totalCosts > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-300">Mzdy</span>
                                            <span className="font-semibold dark:text-white">
                                                {currency.format(data.totalLaborCost)}
                                                <span className="ml-2 text-xs text-gray-400">
                                                    {((data.totalLaborCost / data.totalCosts) * 100).toFixed(0)}%
                                                </span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min((data.totalLaborCost / data.totalCosts) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Overhead Cost Bar */}
                                {data.totalCosts > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-300">Režie</span>
                                            <span className="font-semibold dark:text-white">
                                                {currency.format(data.totalOverheadCost)}
                                                <span className="ml-2 text-xs text-gray-400">
                                                    {((data.totalOverheadCost / data.totalCosts) * 100).toFixed(0)}%
                                                </span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div
                                                className="bg-orange-500 h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min((data.totalOverheadCost / data.totalCosts) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Productivity Card */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Produktivita</p>
                                    <p className="text-3xl font-bold mt-1 text-[#333333] dark:text-white">
                                        {data.totalHours.toLocaleString('cs-CZ')} h
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Celkem odpracováno</p>
                                </div>
                                <span className={`text-lg font-bold ${data.totalEstimatedHours > 0 && (data.totalHours / data.totalEstimatedHours) <= 1 ? "text-green-500" : "text-red-500"}`}>
                                    {data.totalEstimatedHours > 0 ? `${((data.totalHours / data.totalEstimatedHours) * 100).toFixed(0)}%` : '0%'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Realita / Plán</p>
                                    <p className="text-lg font-bold dark:text-white">
                                        {data.totalHours.toLocaleString('cs-CZ')} / {data.totalEstimatedHours.toLocaleString('cs-CZ')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Hodinová mzda</p>
                                    <p className="text-lg font-bold dark:text-white">{formatRate(data.averageHourlyWage)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Sazba firmy</p>
                                    <p className="text-lg font-bold dark:text-white">{formatRate(data.avgCompanyRate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Marže / hodina</p>
                                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                        {formatRate(data.avgCompanyRate - data.averageHourlyWage)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

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
