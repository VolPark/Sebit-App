'use client';

import { useState, useEffect, Fragment } from 'react';
import { Loader2, TrendingUp, Users, Wrench, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';

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
    breakdown: Array<{
        name: string;
        amount: number;
        code: string;
    }>;
    costStructure: Array<{
        code: string;
        name: string;
        amount: number;
    }>;
}

export function ValueAddedTab() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    // UI State
    const [selectedGroup, setSelectedGroup] = useState<string>('51');

    // State for editing
    const [editingAccount, setEditingAccount] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    // State for drill-down
    const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
    const [detailData, setDetailData] = useState<Record<string, any[]>>({});
    const [detailLoading, setDetailLoading] = useState<string | null>(null);

    // Supplier grouping state
    const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());

    const toggleDetail = async (account: string) => {
        if (expandedAccount === account) {
            setExpandedAccount(null);
            setExpandedSuppliers(new Set()); // Reset supplier expansion
            return;
        }

        setExpandedAccount(account);
        setExpandedSuppliers(new Set()); // Reset supplier expansion

        if (!detailData[account]) {
            setDetailLoading(account);
            try {
                const res = await fetch(`/api/accounting/reports/value-added/detail?account=${account}&year=${year}`);
                if (!res.ok) throw new Error('Failed to fetch detail');
                const json = await res.json();
                setDetailData(prev => ({ ...prev, [account]: json.items }));
            } catch (e) {
                console.error(e);
            } finally {
                setDetailLoading(null);
            }
        }
    };

    const toggleSupplier = (supplierKey: string) => {
        const newSet = new Set(expandedSuppliers);
        if (newSet.has(supplierKey)) {
            newSet.delete(supplierKey);
        } else {
            newSet.add(supplierKey);
        }
        setExpandedSuppliers(newSet);
    };

    const groupItemsBySupplier = (items: any[]) => {
        const grouped: Record<string, { name: string; amount: number; items: any[], ico?: string }> = {};

        items.forEach(item => {
            const key = item.supplier || 'Neznámý dodavatel';
            if (!grouped[key]) {
                grouped[key] = {
                    name: key,
                    amount: 0,
                    items: [],
                    ico: item.ico
                };
            }
            grouped[key].amount += item.amount;
            grouped[key].items.push(item);
        });

        return Object.values(grouped).sort((a, b) => b.amount - a.amount);
    };

    useEffect(() => {
        fetchData();
    }, [year]);

    async function fetchData() {
        setLoading(true);
        // Clear details cache to force re-fetch on expansion after refresh
        setDetailData({});
        setExpandedAccount(null); // Collapse all to avoid stale state visual
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

    const { metrics, breakdown, costStructure } = data;

    // Filter logic
    const filteredAccounts = breakdown?.filter(item => item.code.startsWith(selectedGroup)) || [];
    const selectedGroupTotal = filteredAccounts.reduce((sum, item) => sum + item.amount, 0);

    // UI Helpers
    const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
        <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className || ''}`}>
            {children}
        </div>
    );

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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Přidaná hodnota a Marže</h2>
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

                {/* Cost Structure - Dynamic Visualization */}
                <Card className="col-span-3">
                    <div className="p-6">
                        <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">Struktura Nákladů (Všechny skupiny)</h3>
                        <div className="space-y-4">
                            {costStructure?.map((item) => {
                                const totalCosts = metrics.totalMaterial + metrics.totalServices + metrics.totalPersonnel + metrics.totalOtherCosts;
                                const percent = (item.amount / totalCosts) * 100;
                                const isSelected = selectedGroup === item.code;

                                const getColor = (c: string) => {
                                    if (c === '50') return 'bg-gray-500';
                                    if (c === '51') return 'bg-orange-500';
                                    if (c === '52') return 'bg-blue-500';
                                    if (c === '53') return 'bg-red-500';
                                    if (c === '54') return 'bg-purple-500';
                                    if (c === '55') return 'bg-yellow-500';
                                    return 'bg-slate-400';
                                };

                                return (
                                    <div
                                        key={item.code}
                                        onClick={() => setSelectedGroup(item.code)}
                                        className={`space-y-2 cursor-pointer p-2 -mx-2 rounded-lg transition-colors ${isSelected ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'}`}
                                    >
                                        <div className="flex items-center justify-between text-sm">
                                            <span className={isSelected ? 'font-semibold text-slate-900 dark:text-white' : ''}>{item.name} ({item.code})</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{formatCurrency(item.amount)}</span>
                                                {isSelected && <ArrowLeft className="w-3 h-3 text-slate-400 rotate-180" />}
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full ${getColor(item.code)}`} style={{ width: `${percent}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>

                {/* Detail Table */}
                <Card className="col-span-4">
                    <div className="p-6 pb-0">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold leading-none tracking-tight">Detail Účtů ({selectedGroup}xxxx)</h3>
                            <span className="text-sm text-slate-500 font-medium">Celkem: {formatCurrency(selectedGroupTotal)}</span>
                        </div>
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
                                {filteredAccounts.map((item) => (
                                    <Fragment key={item.code}>
                                        <tr
                                            className={`group transition-colors cursor-pointer ${expandedAccount === item.code ? 'bg-slate-50 dark:bg-slate-800 border-b-0' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                            onClick={() => !editingAccount && toggleDetail(item.code)}
                                        >
                                            <td className="px-6 py-4 font-medium text-slate-500">{item.code}</td>
                                            <td className="px-6 py-4 font-medium" onClick={(e) => e.stopPropagation()}>
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
                                                    <div className="group/edit relative pr-4 flex items-center gap-2">
                                                        <span>{item.name}</span>
                                                        <button onClick={(e) => { e.stopPropagation(); startEditing(item.code, item.name); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-all p-1">
                                                            <span className="sr-only">Upravit</span>
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">{formatCurrency(item.amount)}</td>
                                            <td className="px-6 py-4 text-right text-slate-500">{formatPercent(item.amount, selectedGroupTotal)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`transition-transform duration-200 ${expandedAccount === item.code ? 'rotate-90' : ''}`}>
                                                    <ArrowRight className="w-4 h-4 text-slate-400" />
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expandable Detail */}
                                        {expandedAccount === item.code && (
                                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                <td colSpan={5} className="px-6 pb-6 pt-0">
                                                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-in slide-in-from-top-2">
                                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Detail transakcí ({item.code})</h4>

                                                        {detailLoading === item.code ? (
                                                            <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5 text-slate-400" /></div>
                                                        ) : detailData[item.code]?.length > 0 ? (
                                                            <table className="w-full text-xs">
                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                    {groupItemsBySupplier(detailData[item.code]).map((group) => (
                                                                        <Fragment key={group.name}>
                                                                            {/* Supplier Header */}
                                                                            <tr
                                                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-slate-700 dark:text-slate-300 font-medium bg-slate-50/50 dark:bg-slate-900/50"
                                                                                onClick={() => toggleSupplier(group.name)}
                                                                            >
                                                                                <td colSpan={3} className="py-2 pl-2">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className={`transition-transform duration-200 ${expandedSuppliers.has(group.name) ? 'rotate-90' : ''}`}>
                                                                                            <ArrowRight className="w-3 h-3 text-slate-400" />
                                                                                        </div>
                                                                                        <span className="text-blue-600 dark:text-blue-400">{group.name}</span>
                                                                                        {group.ico && <span className="text-slate-400 text-[10px]">({group.ico})</span>}
                                                                                        <span className="text-slate-400 text-[10px] ml-1">({group.items.length} pol.)</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-2 text-right font-bold pr-2">{formatCurrency(group.amount)}</td>
                                                                            </tr>

                                                                            {/* Expanded Items */}
                                                                            {expandedSuppliers.has(group.name) && group.items.map((entry: any, i: number) => (
                                                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-2 border-slate-100 dark:border-slate-800">
                                                                                    <td className="py-2 pl-8 text-slate-500 w-24 whitespace-nowrap">{new Date(entry.date).toLocaleDateString('cs-CZ')}</td>
                                                                                    <td className="py-2 text-slate-600 dark:text-slate-400">
                                                                                        {entry.text}
                                                                                        {entry.doc_vs && <span className="text-slate-400 text-[10px] ml-1">VS: {entry.doc_vs}</span>}
                                                                                    </td>
                                                                                    <td className="py-2"></td>
                                                                                    <td className="py-2 text-right text-slate-500 pr-2">{formatCurrency(entry.amount)}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </Fragment>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        ) : (
                                                            <p className="text-center text-sm text-slate-400 py-4">Žádné detailní záznamy nenalezeny.</p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                                {filteredAccounts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Žádná data pro skupinu {selectedGroup}</td>
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
