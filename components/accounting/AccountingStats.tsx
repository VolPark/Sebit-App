'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CompanyConfig } from '@/lib/companyConfig';

interface Stats {
    issuedCount: number;
    issuedAmount: number;
    receivedCount: number;
    receivedAmount: number;
    unmappedCount: number;
    unmappedAmount: number;
}

export function AccountingStats() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);

        const year = new Date().getFullYear();
        const start = `${year}-01-01`;
        const end = `${year}-12-31`;

        // Parallel fetch
        const [issued, received, unmapped] = await Promise.all([
            // Issued
            supabase.from('accounting_documents')
                .select('amount, amount_czk, currency')
                .eq('type', 'sales_invoice')
                .gte('issue_date', start)
                .lte('issue_date', end)
                .neq('status', 'cancelled'),

            // Received
            supabase.from('accounting_documents')
                .select('amount, amount_czk, currency')
                .eq('type', 'purchase_invoice')
                .gte('issue_date', start)
                .lte('issue_date', end)
                .neq('status', 'cancelled'),

            // Unmapped (Received only usually important, but lets count all)
            // Logic: Count docs where mappings is empty? Or sum gap?
            // "Unmapped items" usually refers to *costs* that need allocation.
            // Let's count *Documents* that are NOT fully mapped.
            supabase.from('accounting_documents')
                .select('id, amount, amount_czk, currency, raw_data, mappings:accounting_mappings(id, amount)')
                // Unmapped documents are a "todo" list, so we should show them regardless of year
                // to prevent missing tasks from previous periods.
                .neq('status', 'cancelled')
        ]);

        // Helpers
        const sumAmount = (data: any[]) => data.reduce((acc, doc) => {
            const val = doc.amount_czk || (doc.currency === 'CZK' ? doc.amount : 0); // Approx if no sync
            return acc + (Number(val) || 0);
        }, 0);

        const unmappedData = (unmapped.data || []).filter((doc: any) => {
            // Calculate effective amount (mirrored from DocumentsTable)
            const rd = doc.raw_data || {};
            const items = Array.isArray(rd.items) ? rd.items : [];
            const settledAmount = (parseFloat(rd.total_amount || 0) === 0)
                ? items.reduce((sum: number, item: any) => {
                    const price = parseFloat(item.total_price || item.total_price_vat_inclusive || 0);
                    return price < 0 ? sum + Math.abs(price) : sum;
                }, 0)
                : 0;

            const isSettlement = settledAmount > 0 && parseFloat(rd.total_amount || 0) === 0;
            const effectiveAmount = isSettlement ? settledAmount : doc.amount;

            const mappedSum = (doc.mappings || []).reduce((s: number, m: any) => s + Number(m.amount), 0);

            // Return true if significantly unmapped
            return Math.abs(Number(effectiveAmount) - mappedSum) > 1;
        });

        setStats({
            issuedCount: issued.data?.length || 0,
            issuedAmount: sumAmount(issued.data || []),
            receivedCount: received.data?.length || 0,
            receivedAmount: sumAmount(received.data || []),
            unmappedCount: unmappedData.length,
            unmappedAmount: 0 // Not calculating sum of unmapped GAP for now, just count
        });

        setLoading(false);
    };

    const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

    if (loading) return <div className="p-8 text-center text-slate-500">Načítám statistiky...</div>;
    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Vydané faktury (Rok {new Date().getFullYear()})</h3>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{currency.format(stats.issuedAmount)}</div>
                <div className="text-sm text-slate-500">{stats.issuedCount} dokladů</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Přijaté faktury (Rok {new Date().getFullYear()})</h3>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{currency.format(stats.receivedAmount)}</div>
                <div className="text-sm text-slate-500">{stats.receivedCount} dokladů</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Nepřiřazené doklady</h3>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">{stats.unmappedCount}</div>
                <div className="text-sm text-slate-500">Čeká na rozpad nákladů</div>
            </div>
        </div>
    );
}
