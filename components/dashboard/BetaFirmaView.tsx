'use client';

import { useState, useEffect, useMemo } from 'react';
import { getDashboardDataBeta, getDetailedStatsBeta } from '@/lib/dashboard-beta';
import type { DashboardData, MonthlyData, ActionStats, ClientStats } from '@/lib/dashboard';
import { APP_START_YEAR } from '@/lib/config';
import BarChart from '@/components/BarChart';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import CompanyActionsTable from '@/components/CompanyActionsTable';
import { getMaterialConfig } from '@/lib/material-config';
import { formatRate } from '@/lib/formatting';

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

interface BetaFirmaViewProps {
    onActionClick: (action: ActionStats) => void;
}

export default function BetaFirmaView({ onActionClick }: BetaFirmaViewProps) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [detailedStats, setDetailedStats] = useState<{ clients: ClientStats[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<string | number>('last12months');
    const [selectedMonths, setSelectedMonths] = useState<MonthlyData[]>([]);

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
                periodParam = { year: period };
            } else {
                periodParam = 'last12months';
            }

            const [dashboardData, stats] = await Promise.all([
                getDashboardDataBeta(periodParam, {}),
                getDetailedStatsBeta(periodParam, {}),
            ]);

            setData(dashboardData);
            setDetailedStats(stats);
            setSelectedMonths([]);
            setLoading(false);
        }
        loadDashboard();
    }, [period]);

    const kpiData = useMemo(() => {
        if (!data) return null;
        if (!selectedMonths || selectedMonths.length === 0) return data;

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
            totalMaterialKlient: 0,
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
            agg.totalMaterialKlient += m.totalMaterialKlient;
        });

        agg.averageHourlyWage = agg.totalHours > 0 ? agg.totalLaborCost / agg.totalHours : 0;
        agg.avgCompanyRate = agg.totalHours > 0 ? (agg.totalRevenue - agg.totalMaterialKlient) / agg.totalHours : 0;

        return agg;
    }, [data, selectedMonths]);

    const aggregatedTopClients = useMemo(() => {
        if (!data) return [];
        if (selectedMonths.length === 0) return data.topClients || [];
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
        if (!data) return [];
        if (selectedMonths.length === 0) return data.topWorkers || [];
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

    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = currentYear; year >= APP_START_YEAR; year--) {
            years.push(year);
        }
        return years;
    }, []);

    const handleMonthClick = (monthData: MonthlyData, isMultiSelect: boolean) => {
        if (isMultiSelect) {
            const exists = selectedMonths.some(m => m.month === monthData.month && m.year === monthData.year);
            if (exists) {
                setSelectedMonths(selectedMonths.filter(m => !(m.month === monthData.month && m.year === monthData.year)));
            } else {
                setSelectedMonths([...selectedMonths, monthData]);
            }
        } else {
            if (selectedMonths.length === 1 && selectedMonths[0].month === monthData.month && selectedMonths[0].year === monthData.year) {
                setSelectedMonths([]);
            } else {
                setSelectedMonths([monthData]);
            }
        }
    };

    const getPeriodLabel = () => {
        if (period === 'last12months') return 'Posledních 12 měsíců';
        if (period === 'thisYear') return `Rok ${new Date().getFullYear()}`;
        if (period === 'lastYear') return `Rok ${new Date().getFullYear() - 1}`;
        return `Rok ${period}`;
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Period Selector */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Přehled
                    <span className="ml-2 text-lg font-normal text-gray-500">
                        ({getPeriodLabel()})
                    </span>
                </h1>

                <div className="flex gap-2 items-center">
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

            {loading || !data || !kpiData ? (
                <DashboardSkeleton view="firma" />
            ) : (
                <div className="space-y-6">
                    <BarChart data={data.monthlyData} onMonthClick={handleMonthClick} selectedMonths={selectedMonths} />

                    {/* Hero Metrics Row */}
                    <div className={`grid grid-cols-1 ${getMaterialConfig().isVisible ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
                        <KPICard
                            title="Příjmy"
                            value={currency.format(kpiData.totalRevenue)}
                            helpText="Celkové příjmy"
                        />
                        <KPICard
                            title="Zisk"
                            value={currency.format(kpiData.grossProfit)}
                            helpText="Příjmy - Náklady"
                            percentage={kpiData.totalRevenue > 0 ? `${((kpiData.grossProfit / kpiData.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                            percentageColor={kpiData.grossProfit >= 0 ? "text-green-500" : "text-red-500"}
                        />
                        {getMaterialConfig().isVisible && (
                            <KPICard
                                title={`Zisk (${getMaterialConfig().labelLowercase})`}
                                value={currency.format(kpiData.materialProfit)}
                                helpText={`Marže na ${getMaterialConfig().labelLowercase}u`}
                                percentage={kpiData.totalRevenue > 0 ? `${((kpiData.materialProfit / kpiData.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                                percentageColor={kpiData.materialProfit >= 0 ? "text-green-500" : "text-red-500"}
                            />
                        )}
                        <KPICard
                            title="Profit Margin"
                            value={kpiData.totalRevenue > 0 ? `${((kpiData.grossProfit / kpiData.totalRevenue) * 100).toFixed(1)}%` : '0%'}
                            helpText="Zisková marže"
                            percentageColor={kpiData.grossProfit >= 0 ? "text-green-500" : "text-red-500"}
                        />
                    </div>

                    {/* Consolidated Cost Breakdown & Productivity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Cost Breakdown Card */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Náklady</p>
                                    <p className="text-3xl font-bold mt-1 text-[#333333] dark:text-white">{currency.format(kpiData.totalCosts)}</p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                        {getMaterialConfig().isVisible ? `${getMaterialConfig().label} + Mzdy + Režie` : 'Mzdy + Režie'}
                                    </p>
                                </div>
                                <span className="text-lg font-bold text-red-500">
                                    {kpiData.totalRevenue > 0 ? `${((kpiData.totalCosts / kpiData.totalRevenue) * 100).toFixed(0)}%` : '0%'}
                                </span>
                            </div>

                            <div className="space-y-3 mt-4">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Rozpad nákladů</p>

                                {getMaterialConfig().isVisible && kpiData.totalCosts > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-300">{getMaterialConfig().label}</span>
                                            <span className="font-semibold dark:text-white">
                                                {currency.format(kpiData.totalMaterialCost)}
                                                <span className="ml-2 text-xs text-gray-400">
                                                    {((kpiData.totalMaterialCost / kpiData.totalCosts) * 100).toFixed(0)}%
                                                </span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div
                                                className="bg-purple-500 h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min((kpiData.totalMaterialCost / kpiData.totalCosts) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {kpiData.totalCosts > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-300">Mzdy</span>
                                            <span className="font-semibold dark:text-white">
                                                {currency.format(kpiData.totalLaborCost)}
                                                <span className="ml-2 text-xs text-gray-400">
                                                    {((kpiData.totalLaborCost / kpiData.totalCosts) * 100).toFixed(0)}%
                                                </span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min((kpiData.totalLaborCost / kpiData.totalCosts) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {kpiData.totalCosts > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-300">Režie</span>
                                            <span className="font-semibold dark:text-white">
                                                {currency.format(kpiData.totalOverheadCost)}
                                                <span className="ml-2 text-xs text-gray-400">
                                                    {((kpiData.totalOverheadCost / kpiData.totalCosts) * 100).toFixed(0)}%
                                                </span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                            <div
                                                className="bg-orange-500 h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min((kpiData.totalOverheadCost / kpiData.totalCosts) * 100, 100)}%` }}
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
                                        {kpiData.totalHours.toLocaleString('cs-CZ')} h
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Celkem odpracováno</p>
                                </div>
                                <span className={`text-lg font-bold ${kpiData.totalEstimatedHours > 0 && (kpiData.totalHours / kpiData.totalEstimatedHours) <= 1 ? "text-green-500" : "text-red-500"}`}>
                                    {kpiData.totalEstimatedHours > 0 ? `${((kpiData.totalHours / kpiData.totalEstimatedHours) * 100).toFixed(0)}%` : '0%'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Realita / Plán</p>
                                    <p className="text-lg font-bold dark:text-white">
                                        {kpiData.totalHours.toLocaleString('cs-CZ')} / {kpiData.totalEstimatedHours.toLocaleString('cs-CZ')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Hodinová mzda</p>
                                    <p className="text-lg font-bold dark:text-white">{formatRate(kpiData.averageHourlyWage)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Sazba firmy</p>
                                    <p className="text-lg font-bold dark:text-white">{formatRate(kpiData.avgCompanyRate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Marže / hodina</p>
                                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                        {formatRate(kpiData.avgCompanyRate - kpiData.averageHourlyWage)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Lists */}
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

                    {/* Actions Table */}
                    {detailedStats && (
                        <CompanyActionsTable
                            data={detailedStats.clients.flatMap(c => c.actions)}
                            onActionClick={onActionClick}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
