
"use client"

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Scale, Info } from "lucide-react";

export function VatEstimationTile() {
    const [year] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount);
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/accounting/reports/tax-estimation?year=${year}`);
            if (!res.ok) throw new Error('Failed to fetch tax estimation');
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [year]);

    if (loading) return <div className="w-full h-full min-h-[12rem] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />;
    if (error || !data) return null;

    const { vat } = data;
    const isPayable = vat.net > 0;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full group relative hover:border-blue-300 dark:hover:border-blue-700 transition-colors">

            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">DPH</h3>
                </div>
                {/* Status Badge */}
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${isPayable ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'}`}>
                    {isPayable ? 'K úhradě' : 'Nadměrný odpočet'}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col justify-between h-full">

                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Vybráno (Výstup)</span>
                        <div className="text-base font-bold text-slate-700 dark:text-slate-300 mt-0.5">{formatCurrency(vat.output)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Uplatněno (Vstup)</span>
                        <div className="text-base font-bold text-slate-700 dark:text-slate-300 mt-0.5">{formatCurrency(vat.input)}</div>
                    </div>
                </div>

                {/* Result */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-500">Výsledek DPH</span>
                        <span className={`text-sm font-bold ${isPayable ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isPayable ? 'K úhradě' : 'Nadměrný odpočet'}: {formatCurrency(Math.abs(vat.net))}
                        </span>
                    </div>
                </div>
            </div>
            {/* Decoration line on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
