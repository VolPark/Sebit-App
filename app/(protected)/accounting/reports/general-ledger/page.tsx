'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, RefreshCw, Filter, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function GeneralLedgerPage() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [meta, setMeta] = useState<any>({ page: 1, pages: 1, total: 0 });
    const [year, setYear] = useState(new Date().getFullYear());

    const fetchRecords = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                per_page: '50',
                year: String(year),
                search
            });
            const res = await fetch(`/api/accounting/reports/general-ledger?${params}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch');

            // Safety check for account display (in case backend sync wasn't run yet)
            // But ideally backend handles this.
            setRecords(data.items || []);
            setMeta(data.meta || { page: 1, pages: 1, total: 0 });
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchRecords(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search, year]);

    const currencyFormat = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val);
    };

    return (
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/accounting/reports" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Hlavní kniha</h1>
                        <p className="text-muted-foreground text-slate-500">Účetní deník {year}</p>
                    </div>
                </div>
                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 overflow-x-auto">
                    {(() => {
                        const currentYear = new Date().getFullYear();
                        const startYear = 2025;
                        const years = [];
                        // Generate years from 2025 to current year only (no future +1)
                        for (let y = startYear; y <= currentYear; y++) {
                            years.push(y);
                        }

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
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        placeholder="Hledat podle účtu, textu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>
                <button
                    onClick={() => fetchRecords(meta.page)}
                    className="flex items-center gap-2 px-4 h-10 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-medium">Obnovit</span>
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Datum</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Doklad</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Text</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-right">MD</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-right">D</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-right">Částka</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        {loading ? 'Načítám data...' : 'Žádné záznamy nenalezeny'}
                                    </td>
                                </tr>
                            ) : (
                                records.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4 text-slate-500 font-mono whitespace-nowrap">
                                            {new Date(record.date).toLocaleDateString('cs-CZ')}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs border border-slate-200 dark:border-slate-700">
                                                {record.uol_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-lg truncate" title={record.text}>
                                            {record.text || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-500">
                                            {record.account_md}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-500">
                                            {record.account_d}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                            {currencyFormat(record.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {meta.pages > 1 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-4 flex justify-between items-center">
                        <button
                            disabled={meta.page <= 1}
                            onClick={() => fetchRecords(meta.page - 1)}
                            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50"
                        >
                            Předchozí
                        </button>
                        <span className="text-sm text-slate-500">
                            Strana {meta.page} z {meta.pages} (Celkem {meta.total})
                        </span>
                        <button
                            disabled={meta.page >= meta.pages}
                            onClick={() => fetchRecords(meta.page + 1)}
                            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50"
                        >
                            Další
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
