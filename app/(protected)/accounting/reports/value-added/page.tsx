
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, TrendingUp, Users, Wrench, RefreshCw, ArrowLeft } from 'lucide-react';

interface ReportData {
    year: number;
    metrics: {
        totalRevenue: number;
        totalMaterial: number;
        totalServices: number;
        totalPersonnel: number;
        totalOtherCosts: number;
        valueAdded: number;
        operatingResult: number;
    };
    servicesBreakdown: Array<{
        name: string;
        amount: number;
        code: string;
    }>;
}

export default function ValueAddedReport() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    // State for editing
    const [editingAccount, setEditingAccount] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        fetchData();
    }, [year]);

    async function fetchData() {
        setLoading(true);
        try {
            const res = await fetch(`/api/accounting/reports/value-added?year=${year}`);
            if (!res.ok) throw new Error('Failed to fetch data');
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val);
    };

    const formatPercent = (val: number, total: number) => {
        if (!total) return '0 %';
        return `${((val / total) * 100).toFixed(1)} %`;
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    if (!data) return <div className="p-6">Failed to load data.</div>;

    const { metrics, servicesBreakdown } = data;

    // UI Helpers
    const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
        <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className || ''}`}>
            {children}
        </div>
    );

    /* State for editing moved to top */

    const startEditing = (code: string, currentName: string) => {
        setEditingAccount(code);
        setEditValue(currentName);
    };

    const saveName = async (code: string) => {
        try {
            const res = await fetch('/api/accounting/settings/accounts/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, name: editValue })
            });
            if (!res.ok) throw new Error('Failed to save');

            setEditingAccount(null);
            fetchData(); // Refresh data to see new name
        } catch (e) {
            console.error('Save failed', e);
            alert('Chyba při ukládání');
        }
    };

    return (
        <div className="space-y-8 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/accounting?tab=reports" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Přidaná hodnota a Marže</h1>
                </div>

                <div className="flex gap-2">
                    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 overflow-x-auto">
                        {(() => {
                            const currentYear = new Date().getFullYear();
                            const startYear = 2025;
                            const years = [];
                            for (let y = startYear; y <= currentYear; y++) years.push(y);

                            return years.map(y => (
                                <button
                                    key={y}
                                    onClick={() => setYear(y)}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all whitespace-nowrap ${year === y
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {y}
                                </button>
                            ));
                        })()}
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Obnovit"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <div className="p-6">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="text-sm font-medium text-slate-500">Celkové Výnosy</h3>
                            <TrendingUp className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(metrics.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Obchodní marže: {formatPercent(metrics.valueAdded, metrics.totalRevenue)}</p>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="text-sm font-medium text-slate-500">Přidaná hodnota</h3>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(metrics.valueAdded)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Výnosy - (Materiál + Služby)
                        </p>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="text-sm font-medium text-slate-500">Náklady na služby</h3>
                            <Wrench className="h-4 w-4 text-orange-500" />
                        </div>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(metrics.totalServices)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatPercent(metrics.totalServices, metrics.totalRevenue)} z výnosů
                        </p>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="text-sm font-medium text-slate-500">Osobní náklady</h3>
                            <Users className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(metrics.totalPersonnel)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatPercent(metrics.totalPersonnel, metrics.totalRevenue)} z výnosů
                        </p>
                    </div>
                </Card>
            </div>

            {/* Structure Analysis */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* Cost Structure - Simple Visualization */}
                <Card className="col-span-3">
                    <div className="p-6">
                        <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">Struktura Nákladů (TOP)</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Služby (51)</span>
                                    <span className="font-bold">{formatCurrency(metrics.totalServices)}</span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500" style={{ width: `${(metrics.totalServices / (metrics.totalServices + metrics.totalPersonnel + metrics.totalMaterial)) * 100}%` }} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Osobní náklady (52)</span>
                                    <span className="font-bold">{formatCurrency(metrics.totalPersonnel)}</span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${(metrics.totalPersonnel / (metrics.totalServices + metrics.totalPersonnel + metrics.totalMaterial)) * 100}%` }} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Materiál a energie (50)</span>
                                    <span className="font-bold">{formatCurrency(metrics.totalMaterial)}</span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-500" style={{ width: `${(metrics.totalMaterial / (metrics.totalServices + metrics.totalPersonnel + metrics.totalMaterial)) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Services Breakdown Table */}
                <Card className="col-span-4">
                    <div className="p-6 pb-0">
                        <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">Detail Služeb (51xxxx)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Účet</th>
                                    <th className="px-6 py-3 font-medium">Název</th>
                                    <th className="px-6 py-3 font-medium text-right">Částka</th>
                                    <th className="px-6 py-3 font-medium text-right">%</th>
                                    <th className="px-6 py-3 font-medium w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {servicesBreakdown.map((item) => (
                                    <tr key={item.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                                        <td className="px-6 py-4 font-medium text-slate-500">{item.code}</td>
                                        <td className="px-6 py-4 font-medium">
                                            {editingAccount === item.code ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        autoFocus
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        className="border rounded px-2 py-1 text-sm w-full bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') saveName(item.code);
                                                            if (e.key === 'Escape') setEditingAccount(null);
                                                        }}
                                                    />
                                                    <button onClick={() => saveName(item.code)} className="text-green-600 hover:text-green-700 font-medium text-xs">OK</button>
                                                    <button onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-slate-500 font-medium text-xs">X</button>
                                                </div>
                                            ) : (
                                                <span className="cursor-pointer hover:underline decoration-dashed underline-offset-4 decoration-slate-300" onClick={() => startEditing(item.code, item.name)}>{item.name}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(item.amount)}</td>
                                        <td className="px-6 py-4 text-right text-slate-500">{formatPercent(item.amount, metrics.totalServices)}</td>
                                        <td className="px-6 py-4 text-center">
                                            {!editingAccount && (
                                                <button onClick={() => startEditing(item.code, item.name)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-all p-1">
                                                    <span className="sr-only">Upravit</span>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {servicesBreakdown.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Žádná data</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
