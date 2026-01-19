
'use client';

import { useEffect, useState } from 'react';
import { Scale, Info, TrendingUp, TrendingDown } from 'lucide-react';

interface VatData {
    inputVat: number;
    outputVat: number;
    netVat: number;
}

export function VatControlTile() {
    const [data, setData] = useState<VatData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/accounting/analytics/vat')
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />;
    }

    if (!data) return null;

    const currency = new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0
    });

    const isPayable = data.netVat > 0;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full group relative hover:border-blue-300 dark:hover:border-blue-700 transition-colors">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 relative group/info">
                            <h3 className="font-semibold text-slate-900 dark:text-white">DPH Kontrola</h3>

                            {/* Simple Tooltip Trigger */}
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />

                            {/* Tooltip Content */}
                            <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-50 pointer-events-none">
                                <p className="font-semibold mb-1">Výpočet DPH:</p>
                                <p className="mb-2 text-slate-300">
                                    Rozdíl mezi DPH na výstupu a DPH na vstupu za aktuální měsíc.
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-700">
                                    <div>
                                        <span className="font-medium text-red-400">Výstup (D):</span><br />
                                        Daňová povinnost
                                    </div>
                                    <div>
                                        <span className="font-medium text-emerald-400">Vstup (MD):</span><br />
                                        Odpočet / Zaplaceno
                                    </div>
                                </div>
                                {/* Arrow pointing UP */}
                                <div className="absolute left-4 top-0 w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">Aktuální měsíc</p>
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${isPayable ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'}`}>
                    {isPayable ? 'K úhradě' : 'Nadměrný odpočet'}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col justify-center items-center h-full">

                {/* Main Number */}
                <div className="text-center mb-6">
                    <div className={`text-3xl font-bold ${isPayable ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-500'}`}>
                        {currency.format(Math.abs(data.netVat))}
                    </div>
                    <p className={`text-sm ${isPayable ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'} font-medium mt-1`}>
                        {isPayable ? 'Musíte odvést státu' : 'Stát vám vrátí'}
                    </p>
                </div>

                {/* Breakdown Rows */}
                <div className="w-full grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex flex-col gap-1 text-center border-r border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Výstup (Dlužím)</span>
                        <div className="flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                            {currency.format(data.outputVat)}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 text-center">
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Vstup (Nárok)</span>
                        <div className="flex items-center justify-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                            {currency.format(data.inputVat)}
                        </div>
                    </div>
                </div>

            </div>

            {/* Decoration line on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
