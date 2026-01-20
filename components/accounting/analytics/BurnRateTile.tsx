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
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${theme.iconBg}`}>
                        <Activity className={`w-4 h-4 ${theme.iconText}`} />
                    </div>
                    <div className="flex items-center gap-1.5 group/info">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Runway</h3>
                        {/* Simple Tooltip Trigger */}
                        <Info className="w-3 h-3 text-slate-400 cursor-help hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
                        {/* Tooltip Content omitted for brevity in this optimized view, relying on hover title or separate modal if needed. Adjusted logic to keep tooltip but simpler? 
                             Actually user wants SIMPLIFICATION. Let's keep the tooltip logic but minimal icon.
                         */}
                        <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-50 pointer-events-none">
                            <p className="font-semibold mb-1">Výpočet ukazatele:</p>
                            <p className="mb-2 text-slate-300">
                                Hotovost ÷ Průměrné měsíční náklady
                            </p>
                        </div>
                    </div>
                </div>

                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.iconBg} ${theme.iconText}`}>
                    {statusText}
                </span>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col justify-between h-full bg-white dark:bg-slate-900 relative">
                <div className="w-full h-full flex flex-col justify-between">
                    {/* Main Number */}
                    <div className="text-center py-2">
                        <div className={`text-3xl font-bold ${theme.mainText}`}>
                            {data.runwayMonths === Infinity ? '∞' : data.runwayMonths} <span className="text-lg font-medium text-slate-400">měsíců</span>
                        </div>
                    </div>

                    {/* Simplified Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex flex-col items-center justify-center">
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-0.5">Hotovost</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                {currency.format(data.cash)}
                            </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex flex-col items-center justify-center">
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-0.5">Měs. náklad</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                {currency.format(data.monthlyBurn)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Decoration line on hover */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity ${theme.decoration}`} />
        </div>
    );
}
