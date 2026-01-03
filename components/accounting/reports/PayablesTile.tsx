'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export function PayablesTile() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Fetch unpaid purchase invoices
            const { data, error } = await supabase
                .from('accounting_documents')
                .select('amount, paid_amount')
                .eq('type', 'purchase_invoice')
                .gt('amount', 0);

            if (error) throw error;

            let totalPayables = 0;
            let count = 0;

            if (data) {
                // Filter for unpaid or partially paid
                const unpaid = data.filter(d => (d.amount - (d.paid_amount || 0)) > 1); // tolerance > 1 CZK
                count = unpaid.length;
                totalPayables = unpaid.reduce((sum, d) => sum + (d.amount - (d.paid_amount || 0)), 0);
            }

            setStats({
                totalPayables,
                count
            });
        } catch (e: any) {
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
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full group relative hover:border-rose-300 dark:hover:border-rose-700 transition-colors">
            <Link href="/accounting/reports/payables" className="absolute inset-0 z-10" />

            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Závazky</h3>
                        <p className="text-xs text-slate-500">Neuhrazené faktury</p>
                    </div>
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center items-center bg-white dark:bg-slate-900 relative">
                {loading ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                ) : (
                    <div className="text-center">
                        <div className="text-3xl font-bold text-rose-600 dark:text-rose-500 mb-1">
                            {formatMoney(stats?.totalPayables || 0)}
                        </div>
                        <div className="text-sm text-slate-500 mb-4">
                            {stats?.count} neuhrazených faktur
                        </div>
                        <div className="inline-flex items-center gap-1 text-sm font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-full group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 transition-colors">
                            Zobrazit report <ArrowRight className="w-4 h-4 ml-0.5" />
                        </div>
                    </div>
                )}
            </div>

            {/* Decoration line on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
