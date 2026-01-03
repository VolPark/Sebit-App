'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Printer } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfitLossPage() {
    // State
    const [data, setData] = useState<{ costs: any[], revenues: any[], totals: any } | null>(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());

    // Fetch Logic
    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                year: String(year)
            });
            const res = await fetch(`/api/accounting/reports/profit-loss?${params}`);
            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Failed to fetch');

            setData(json);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [year]);

    // Formatters
    const currencyFormat = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val);
    };

    return (
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/accounting?tab=reports" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Výsledovka (Profit & Loss)</h1>
                        <p className="text-muted-foreground text-slate-500">Náklady a Výnosy {year}</p>
                    </div>
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
                    <button
                        onClick={() => window.print()}
                        className="p-2 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Tisk"
                    >
                        <Printer className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
            </div>

            {/* Profit Summary */}
            <div className={`p-6 rounded-xl border flex flex-col items-center justify-center gap-2 ${data?.totals.profit >= 0
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Hospodářský výsledek</div>
                <div className={`text-4xl font-bold ${data?.totals.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                    {data ? currencyFormat(data.totals.profit) : '...'}
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                {/* Costs Column */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h2 className="font-semibold text-slate-900 dark:text-white">Náklady (5xx)</h2>
                        <span className="font-bold text-lg text-slate-900 dark:text-white">
                            {data ? currencyFormat(data.totals.costs) : '...'}
                        </span>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-slate-500">Účet</th>
                                    <th className="px-4 py-2 font-medium text-slate-500 text-right">Částka</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading && !data ? (
                                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">Načítám...</td></tr>
                                ) : data?.costs.length === 0 ? (
                                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">Žádné náklady</td></tr>
                                ) : (
                                    data?.costs.map((item) => (
                                        <tr key={item.account} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-300">
                                                {item.account} {item.name ? `(${item.name})` : ''}
                                            </td>
                                            <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-white">
                                                {currencyFormat(item.balance)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Revenues Column */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h2 className="font-semibold text-slate-900 dark:text-white">Výnosy (6xx)</h2>
                        <span className="font-bold text-lg text-slate-900 dark:text-white">
                            {data ? currencyFormat(data.totals.revenues) : '...'}
                        </span>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-slate-500">Účet</th>
                                    <th className="px-4 py-2 font-medium text-slate-500 text-right">Částka</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading && !data ? (
                                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">Načítám...</td></tr>
                                ) : data?.revenues.length === 0 ? (
                                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">Žádné výnosy</td></tr>
                                ) : (
                                    data?.revenues.map((item) => (
                                        <tr key={item.account} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-300">
                                                {item.account} {item.name ? `(${item.name})` : ''}
                                            </td>
                                            <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-white">
                                                {currencyFormat(item.balance)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
