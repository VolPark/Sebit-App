
'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { getErrorMessage } from '@/lib/errors';
export function ValueAddedTile() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ year: String(new Date().getFullYear()) });
            const res = await fetch(`/api/accounting/reports/value-added?${params}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch');

            setStats({
                valueAdded: data.metrics?.valueAdded || 0,
                year: new Date().getFullYear()
            });
        } catch (e: unknown) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const currencyFormat = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full group relative hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
            <Link href="/accounting/reports/value-added" className="absolute inset-0 z-10" />

            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Přidaná hodnota</h3>
                        <p className="text-xs text-slate-500">Marže a Služby</p>
                    </div>
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center items-center bg-white dark:bg-slate-900 relative">
                {loading ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                ) : (
                    <div className="text-center">
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                            {currencyFormat(stats?.valueAdded || 0)}
                        </div>
                        <div className="text-sm text-slate-500 mb-4">
                            Přidaná hodnota {stats?.year}
                        </div>
                        <div className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full group-hover:bg-blue-100 transition-colors">
                            Zobrazit detail <ArrowRight className="w-4 h-4 ml-0.5" />
                        </div>
                    </div>
                )}
            </div>

            {/* Decoration line on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
