'use client';

import { useEffect, useState } from 'react';
import { Activity, Wallet, TrendingDown, Info } from 'lucide-react';

interface BurnRateData {
    cash: number;
    monthlyBurn: number;
    runwayMonths: number;
}

export function BurnRateTile() {
    const [data, setData] = useState<BurnRateData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/accounting/analytics/burn-rate')
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

    // Determine status color (Green for high runway, Red for low)
    let colorTheme = 'emerald';
    let statusText = 'Stabilní';

    if (data.runwayMonths < 3) {
        colorTheme = 'red';
        statusText = 'Kritický stav';
    } else if (data.runwayMonths < 6) {
        colorTheme = 'orange';
        statusText = 'Pozor';
    }

    // Color Maps
    const colors: Record<string, any> = {
        emerald: {
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconText: 'text-emerald-600 dark:text-emerald-400',
            mainText: 'text-emerald-600 dark:text-emerald-500',
            hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700',
            decoration: 'bg-emerald-500'
        },
        orange: {
            iconBg: 'bg-orange-50 dark:bg-orange-900/20',
            iconText: 'text-orange-600 dark:text-orange-400',
            mainText: 'text-orange-600 dark:text-orange-500',
            hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-700',
            decoration: 'bg-orange-500'
        },
        red: {
            iconBg: 'bg-red-50 dark:bg-red-900/20',
            iconText: 'text-red-600 dark:text-red-400',
            mainText: 'text-red-600 dark:text-red-500',
            hoverBorder: 'hover:border-red-300 dark:hover:border-red-700',
            decoration: 'bg-red-500'
        }
    };

    const theme = colors[colorTheme];

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full group relative transition-colors ${theme.hoverBorder}`}>

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${theme.iconBg}`}>
                        <Activity className={`w-5 h-5 ${theme.iconText}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 relative group/info">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Runway (Dožití)</h3>

                            {/* Simple Tooltip Trigger */}
                            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />

                            {/* Tooltip Content */}
                            <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-50 pointer-events-none">
                                <p className="font-semibold mb-1">Výpočet ukazatele:</p>
                                <p className="mb-2 text-slate-300">
                                    Aktuální hotovost ÷ Průměrné měsíční náklady (poslední 3 měsíce)
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-700">
                                    <div>
                                        <span className="font-medium text-slate-200">Hotovost:</span><br />
                                        Suma zůstatků všech bankovních účtů.
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-200">Náklady:</span><br />
                                        Průměr účtů třídy 5 (Náklady) z Účetního deníku.
                                    </div>
                                </div>
                                {/* Arrow pointing UP */}
                                <div className="absolute left-4 top-0 w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">Cash flow predikce</p>
                    </div>
                </div>

                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.iconBg} ${theme.iconText}`}>
                    {statusText}
                </span>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col justify-center items-center bg-white dark:bg-slate-900 relative">
                <div className="text-center w-full">
                    <div className={`text-4xl font-bold mb-1 ${theme.mainText}`}>
                        {data.runwayMonths === Infinity ? '∞' : data.runwayMonths} <span className="text-lg font-medium text-slate-400">měsíců</span>
                    </div>

                    {/* Visual Bar (Fuel Gauge) */}
                    <div className="w-full max-w-[180px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto mb-4 overflow-hidden relative">
                        <div
                            className={`h-full rounded-full ${theme.decoration} transition-all duration-1000 ease-out`}
                            style={{ width: `${Math.min((data.runwayMonths / 12) * 100, 100)}%` }}
                        />
                    </div>

                    <p className="text-xs text-slate-400 mb-4 max-w-[200px] mx-auto leading-tight">
                        Doba, po kterou firma přežije bez dalších příjmů.
                    </p>

                    <div className="text-xs text-slate-500 flex justify-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wider">Hotovost</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{currency.format(data.cash)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wider">Měsíční náklady</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{currency.format(data.monthlyBurn)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Decoration line on hover */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity ${theme.decoration}`} />
        </div>
    );
}
