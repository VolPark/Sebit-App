'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { PdfDownloadButton } from '@/components/accounting/reports/PdfDownloadButton';
import { BalanceSheetPdf } from '@/components/accounting/reports/BalanceSheetPdf';
import { getErrorMessage } from '@/lib/errors';

export default function BalanceSheetPage() {
    // State
    const [data, setData] = useState<{ assets: any[], liabilities: any[], totals: any } | null>(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());

    // Fetch Logic
    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                year: String(year)
            });
            const res = await fetch(`/api/accounting/reports/balance-sheet?${params}`);
            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Failed to fetch');

            setData(json);
        } catch (e: unknown) {
            toast.error(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [year]);

    // Formatters
    const currencyFormat = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val);
    };

    return (
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/accounting?tab=reports" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Rozvaha (Balance Sheet)</h1>
                        <p className="text-muted-foreground text-slate-500">Přehled aktiv a pasiv {year}</p>
                    </div>
                </div>
                <div className="flex gap-2">
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
                        onClick={fetchData}
                        className="p-2 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Obnovit"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {data && (
                        <PdfDownloadButton
                            document={<BalanceSheetPdf data={data} year={year} />}
                            fileName={`Rozvaha_${year}.pdf`}
                            label=""
                        />
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                {/* Assets Column */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h2 className="font-semibold text-slate-900 dark:text-white">Aktiva</h2>
                        <span className="font-bold text-lg text-slate-900 dark:text-white">
                            {data ? currencyFormat(data.totals.assets) : '...'}
                        </span>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-slate-500">Účet / Skupina</th>
                                    <th className="px-4 py-2 font-medium text-slate-500 text-right">Zůstatek</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading && !data ? (
                                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">Načítám...</td></tr>
                                ) : data?.assets.length === 0 ? (
                                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">Žádná aktiva</td></tr>
                                ) : (
                                    data?.assets.map((group: any) => (
                                        <Fragment key={group.id}>
                                            {/* Group Header */}
                                            <tr className="bg-slate-50/80 dark:bg-slate-800/50 font-semibold">
                                                <td className="px-4 py-2 text-slate-900 dark:text-white">
                                                    {group.name}
                                                </td>
                                                <td className="px-4 py-2 text-right text-slate-900 dark:text-white">
                                                    {currencyFormat(group.balance)}
                                                </td>
                                            </tr>
                                            {/* Group Items */}
                                            {group.accounts.map((item: any) => (
                                                <tr key={item.account} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                    <td className="px-4 py-1.5 pl-8 font-mono text-slate-600 dark:text-slate-300 text-xs">
                                                        {item.account} {item.name ? `(${item.name})` : ''}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-right font-medium text-slate-700 dark:text-slate-200 text-xs">
                                                        {currencyFormat(item.balance)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Liabilities Column */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h2 className="font-semibold text-slate-900 dark:text-white">Pasiva</h2>
                        <span className="font-bold text-lg text-slate-900 dark:text-white">
                            {data ? currencyFormat(data.totals.liabilities) : '...'}
                        </span>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-slate-500">Účet / Skupina</th>
                                    <th className="px-4 py-2 font-medium text-slate-500 text-right">Zůstatek</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading && !data ? (
                                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">Načítám...</td></tr>
                                ) : data?.liabilities.length === 0 ? (
                                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">Žádná pasiva</td></tr>
                                ) : (
                                    data?.liabilities.map((group: any) => (
                                        <Fragment key={group.id}>
                                            {/* Group Header */}
                                            <tr className="bg-slate-50/80 dark:bg-slate-800/50 font-semibold">
                                                <td className="px-4 py-2 text-slate-900 dark:text-white">
                                                    {group.name}
                                                </td>
                                                <td className="px-4 py-2 text-right text-slate-900 dark:text-white">
                                                    {currencyFormat(group.balance)}
                                                </td>
                                            </tr>
                                            {/* Group Items */}
                                            {group.accounts.map((item: any) => (
                                                <tr key={item.account} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${item.isTotal ? 'text-amber-700 dark:text-amber-400 font-bold' : ''}`}>
                                                    <td className="px-4 py-1.5 pl-8 font-mono text-slate-600 dark:text-slate-300 text-xs">
                                                        {item.account} {item.name ? `(${item.name})` : ''}
                                                    </td>
                                                    <td className="px-4 py-1.5 text-right font-medium text-slate-700 dark:text-slate-200 text-xs">
                                                        {currencyFormat(item.balance)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* CheckSum Alert */}
            {data && Math.abs(data.totals.diff) > 0.01 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 text-red-800 dark:text-red-200 flex justify-between items-center">
                    <span>
                        <strong>Pozor:</strong> Rozvaha se nerovná! Rozdíl: {currencyFormat(data.totals.diff)}
                    </span>
                </div>
            )}
        </div>
    );
}
