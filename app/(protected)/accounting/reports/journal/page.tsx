'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, RefreshCw, BookText } from 'lucide-react';
import { toast } from 'sonner';
import { PdfDownloadButton } from '@/components/accounting/reports/PdfDownloadButton';
import { JournalPdf } from '@/components/accounting/reports/JournalPdf';
import { getErrorMessage } from '@/lib/errors';

export default function JournalPage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                year: String(year)
            });
            const res = await fetch(`/api/accounting/reports/journal?${params}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch');

            setEntries(data.items || []);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [year]);

    const currencyFormat = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val);
    };

    // Client-side filtering
    const filteredEntries = entries.filter((entry) => {
        const term = searchTerm.toLowerCase();
        return (
            entry.text?.toLowerCase().includes(term) ||
            entry.uol_id?.toLowerCase().includes(term) ||
            String(entry.amount).includes(term) ||
            entry.account_md?.includes(term) ||
            entry.account_d?.includes(term)
        );
    });

    return (
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/accounting?tab=reports" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <BookText className="w-6 h-6 text-blue-600" />
                            Účetní deník
                        </h1>
                        <p className="text-muted-foreground text-slate-500">Chronologický přehled ({year})</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Hledat..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 w-64 text-sm border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 overflow-x-auto">
                        {(() => {
                            const currentYear = new Date().getFullYear();
                            const startYear = 2025;
                            const years = [];
                            for (let y = startYear; y <= currentYear; y++) years.push(y);

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
                    <button
                        onClick={fetchRecords}
                        className="p-2 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Obnovit"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {filteredEntries.length > 0 && (
                        <PdfDownloadButton
                            document={<JournalPdf data={filteredEntries} year={year} />}
                            fileName={`Denik_${year}.pdf`}
                            label=""
                        />
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white w-32">Datum</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white w-40">Doklad</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Text</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white w-24 text-right">MD</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white w-24 text-right">D</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-right w-40">Částka</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-12 text-slate-500">Načítám deník...</td></tr>
                            ) : filteredEntries.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-slate-500">Žádné záznamy</td></tr>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-3 text-slate-600 dark:text-slate-300 font-mono">
                                            {new Date(entry.date).toLocaleDateString('cs-CZ')}
                                        </td>
                                        <td className="px-6 py-3 font-medium text-slate-900 dark:text-white font-mono">
                                            {entry.uol_id}
                                        </td>
                                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400 max-w-md truncate" title={entry.text}>
                                            {entry.text}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                                            {entry.account_md}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-amber-600 dark:text-amber-400 font-medium">
                                            {entry.account_d}
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                                            {currencyFormat(entry.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="text-right text-xs text-slate-400">
                Celkem zobrazeno: {filteredEntries.length}
            </div>
        </div>
    );
}
