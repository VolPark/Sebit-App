'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Users, Wallet, CreditCard, PieChart } from 'lucide-react';
import { toast } from 'sonner';

export function ManagementDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchData();
    }, [year]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/accounting/analytics?year=${year}`);
            if (!res.ok) throw new Error('Failed to fetch analytics');
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val);
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Načítám manažerský přehled...</div>;

    // Check if data has error or is null
    if (!data) return <div className="p-12 text-center text-slate-500">Nepodařilo se načíst data. Zkuste obnovit stránku.</div>;
    if (data.error) return <div className="p-12 text-center text-red-500">Chyba: {data.error}</div>;

    const maxCash = Math.max(...data.monthly.map((m: any) => Math.max(m.cashIn, m.cashOut)));
    const maxProfit = Math.max(...data.monthly.map((m: any) => Math.abs(m.profit)));

    // Dynamic years from API or fallback
    const years = data.availableYears && data.availableYears.length > 0
        ? data.availableYears
        : [new Date().getFullYear()];

    return (
        <div className="space-y-6">

            {/* Year Selector */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {years.map((y: number) => (
                    <button
                        key={y}
                        onClick={() => setYear(y)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${year === y
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                    >
                        {y}
                    </button>
                ))}
            </div>

            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-blue-500" /> Celkové příjmy (Cash)
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formatCurrency(data.monthly.reduce((a: number, b: any) => a + b.cashIn, 0))}
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-orange-500" /> Celkové výdaje (Cash)
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formatCurrency(data.monthly.reduce((a: number, b: any) => a + b.cashOut, 0))}
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-500" /> Celkový zisk (EBITDA approx)
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formatCurrency(data.monthly.reduce((a: number, b: any) => a + b.profit, 0))}
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-500" /> Top Zákazník
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white truncate" title={data.topCustomers[0]?.name}>
                            {data.topCustomers[0]?.name || '-'}
                        </div>
                        <div className="text-xs text-slate-500">
                            {formatCurrency(data.topCustomers[0]?.value || 0)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Cash Flow Chart */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-slate-400" />
                        Tok peněz (Cash Flow)
                    </h3>
                    <div className="h-64 flex items-end gap-2 md:gap-4">
                        {data.monthly.map((m: any) => {
                            const hIn = maxCash ? (m.cashIn / maxCash) * 100 : 0;
                            const hOut = maxCash ? (m.cashOut / maxCash) * 100 : 0;
                            return (
                                <div key={m.month} className="flex-1 flex flex-col justify-end items-center group h-full relative">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded z-10 whitespace-nowrap">
                                        {m.month}/{year}<br />In: {formatCurrency(m.cashIn)}<br />Out: {formatCurrency(m.cashOut)}
                                    </div>
                                    <div className="w-full flex gap-0.5 items-end h-full">
                                        <div style={{ height: `${hIn}%` }} className="flex-1 bg-blue-400/80 rounded-t-sm hover:bg-blue-500 transition-all"></div>
                                        <div style={{ height: `${hOut}%` }} className="flex-1 bg-orange-400/80 rounded-t-sm hover:bg-orange-500 transition-all"></div>
                                    </div>
                                    <span className="text-xs text-slate-400 mt-2">{m.month}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-center gap-4 mt-4 text-xs">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div> Příjmy</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-400 rounded-sm"></div> Výdaje</div>
                    </div>
                </div>

                {/* Profit Trend (Area approximation with Bars for simplicity or SVG) */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-slate-400" />
                        Vývoj zisku (Měsíčně)
                    </h3>
                    <div className="h-64 flex items-end gap-2 md:gap-4 relative border-b border-slate-100 dark:border-slate-700">
                        {/* Zero Line */}
                        <div className="absolute w-full border-t border-slate-200 dark:border-slate-700 border-dashed" style={{ bottom: '50%' }}></div>

                        {data.monthly.map((m: any) => {
                            // Normalize to -100% to +100% range centered at 50%
                            const pct = maxProfit ? (m.profit / maxProfit) * 45 : 0; // scale to max 45% height from center
                            const isPositive = m.profit >= 0;

                            return (
                                <div key={m.month} className="flex-1 flex flex-col justify-end h-full relative group">
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded z-10 whitespace-nowrap">
                                        {m.month}/{year}<br />Zisk: {formatCurrency(m.profit)}
                                    </div>

                                    {/* Bar starting from 50% */}
                                    <div className="h-full w-full relative">
                                        <div
                                            className={`absolute w-full rounded-sm transition-all ${isPositive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                                            style={{
                                                height: `${Math.abs(pct)}%`,
                                                bottom: isPositive ? '50%' : undefined,
                                                top: isPositive ? undefined : '50%'
                                            }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-slate-400 mt-2 text-center">{m.month}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-center gap-4 mt-4 text-xs">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Zisk</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500 rounded-sm"></div> Ztráta</div>
                    </div>
                </div>

                {/* Top Expenses */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-slate-400" />
                        Struktura nákladů
                    </h3>
                    <div className="space-y-4">
                        {data.expenseStructure.map((item: any, idx: number) => (
                            <div key={item.group} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full"
                                        style={{ width: `${(item.value / data.expenseStructure[0].value) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-400" />
                        Top 5 Zákazníků
                    </h3>
                    <div className="space-y-4">
                        {data.topCustomers.map((item: any, idx: number) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[70%]">{item.name}</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 rounded-full"
                                        style={{ width: `${(item.value / data.topCustomers[0].value) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {data.topCustomers.length === 0 && (
                            <div className="text-center text-slate-400 py-8">Žádná data</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
