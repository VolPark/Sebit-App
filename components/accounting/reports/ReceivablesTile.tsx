
'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, ArrowRight, TrendingDown, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

import { getErrorMessage } from '@/lib/errors';
export function ReceivablesTile() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Fetch unpaid sales invoices with due_date
            const { data, error } = await supabase
                .from('accounting_documents')
                .select('amount, paid_amount, due_date')
                .eq('type', 'sales_invoice')
                .gt('amount', 0);

            if (error) throw error;

            let totalReceivables = 0;
            let totalOverdue = 0;
            let count = 0;

            if (data) {
                const today = new Date().toISOString().split('T')[0];

                // Filter for unpaid or partially paid
                const unpaid = data.filter(d => (d.amount - (d.paid_amount || 0)) > 1);
                count = unpaid.length;

                unpaid.forEach(d => {
                    const remaining = d.amount - (d.paid_amount || 0);
                    totalReceivables += remaining;

                    if (d.due_date && d.due_date < today) {
                        totalOverdue += remaining;
                    }
                });
            }

            setStats({
                totalReceivables,
                totalOverdue,
                count
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

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full group relative hover:border-lime-300 dark:hover:border-lime-700 transition-colors">
            <Link href="/accounting/reports/receivables" className="absolute inset-0 z-10" />

            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-lime-50 dark:bg-lime-900/20 rounded-lg">
                        <TrendingDown className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Pohledávky</h3>
                </div>

                <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-lime-50 text-lime-600 border border-lime-100 dark:bg-lime-900/20 dark:text-lime-400 dark:border-lime-900/30">
                    K inkasu
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between h-full bg-white dark:bg-slate-900 relative">
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-300" />
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col justify-between">

                        {/* Main Number */}
                        <div className="text-center py-2">
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">
                                {formatMoney(stats?.totalReceivables || 0)}
                            </div>
                        </div>

                        {/* Simplified Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex flex-col items-center justify-center">
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-0.5">Počet faktur</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                    {stats?.count || 0}
                                </span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex flex-col items-center justify-center">
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-0.5">Po splatnosti</span>
                                <span className={`font-bold text-sm ${stats?.totalOverdue > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {formatMoney(stats?.totalOverdue || 0)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <div className="inline-flex items-center gap-1 text-sm font-medium text-lime-600 dark:text-lime-400 group-hover:text-lime-700 dark:group-hover:text-lime-300 transition-colors">
                                Zobrazit report <ArrowRight className="w-4 h-4 ml-0.5" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Decoration line on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-lime-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
