'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Book, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { getErrorMessage } from '@/lib/errors';
export function GeneralLedgerTile() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // We fetch the first page just to get the total count for now
            // Optimally we'd have a stats endpoint, but for now this works.
            const res = await fetch('/api/accounting/reports/general-ledger?per_page=1');
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch');

            // We can also assume we might want to sum totals here if we had a summary endpoint
            setStats({
                totalAccounts: data.meta?.totalAccounts || 0,
                year: data.meta?.year || new Date().getFullYear()
            });
        } catch (e: unknown) {
            console.error(e);
            // toast.error('Nezdařilo se načíst hlavní knihu: ' + getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full group relative hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
            <Link href="/accounting/reports/general-ledger" className="absolute inset-0 z-10" />

            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <Book className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Hlavní kniha</h3>
                        <p className="text-xs text-slate-500">Přehled účtů</p>
                    </div>
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center items-center bg-white dark:bg-slate-900 relative">
                {loading ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                ) : (
                    <div className="text-center">
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                            {stats?.totalAccounts?.toLocaleString('cs-CZ')}
                        </div>
                        <div className="text-sm text-slate-500 mb-4">
                            Aktivních účtů {stats?.year}
                        </div>
                        <div className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full group-hover:bg-blue-100 transition-colors">
                            Zobrazit detail <ArrowRight className="w-4 h-4 ml-0.5" />
                        </div>
                    </div>
                )}
            </div>

            {/* Decoration line on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
