'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { PdfDownloadButton } from '@/components/accounting/reports/PdfDownloadButton';
import { ProfitLossPdf } from '@/components/accounting/reports/ProfitLossPdf';

export default function ProfitLossPage() {
    // State
    const [data, setData] = useState<{
        operating: { revenues: any[], costs: any[], result: number },
        financial: { revenues: any[], costs: any[], result: number },
        tax: { costs: any[], total: number },
        results: { beforeTax: number, afterTax: number },
        meta: any
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());

    // Fetch Logic
    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                year: String(year)
            });
            const res = await fetch(`/api/accounting/reports/profit-loss?${params}`);
            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Failed to fetch');

            setData(json);
        } catch (e: any) {
            toast.error(e.message);
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
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Výsledovka (Profit & Loss)</h1>
                        <p className="text-muted-foreground text-slate-500">Náklady a Výnosy {year}</p>
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
                            document={<ProfitLossPdf data={data} year={year} />}
                            fileName={`Vysledovka_${year}.pdf`}
                            label=""
                        />
                    )}
                </div>
            </div>

            {/* Profit Summary */}
            <div className={`p-6 rounded-xl border flex flex-col items-center justify-center gap-2 ${data?.results.afterTax! >= 0
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Výsledek hospodaření</div>
                <div className={`text-4xl font-bold ${data?.results.afterTax! >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                    {data ? currencyFormat(data.results.afterTax) : '...'}
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 gap-6 print:grid-cols-1 print:gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h2 className="font-semibold text-slate-900 dark:text-white">Výkazy zisku a ztráty</h2>
                        <span className="font-bold text-lg text-slate-900 dark:text-white">
                            {data ? currencyFormat(data.results.afterTax) : '...'}
                        </span>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-slate-500">Položka</th>
                                    <th className="px-4 py-2 font-medium text-slate-500 text-right">Hodnota</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading && !data ? (
                                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">Načítám...</td></tr>
                                ) : !data ? (
                                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">Žádná data</td></tr>
                                ) : (
                                    <>
                                        {/* OPERATING RESULT */}
                                        <tr className="bg-slate-100 dark:bg-slate-800 font-bold"><td colSpan={2} className="px-4 py-2 text-slate-800 dark:text-slate-100 mt-4">Provozní výsledek hospodaření</td></tr>

                                        {/* Operating Revenues */}
                                        {data.operating.revenues.map((g: any) => (
                                            <ReportGroupSection key={g.id} group={g} currencyFormat={currencyFormat} />
                                        ))}

                                        {/* Operating Costs */}
                                        {data.operating.costs.map((g: any) => (
                                            <ReportGroupSection key={g.id} group={g} isCost currencyFormat={currencyFormat} />
                                        ))}

                                        {/* Operating Result Summary */}
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                                            <td className="px-4 py-2 text-slate-900 dark:text-white">
                                                * Provozní výsledek hospodaření
                                            </td>
                                            <td className="px-4 py-2 text-right text-slate-900 dark:text-white">
                                                {currencyFormat(data.operating.result)}
                                            </td>
                                        </tr>

                                        {/* FINANCIAL RESULT */}
                                        <tr className="bg-slate-100 dark:bg-slate-800 font-bold"><td colSpan={2} className="px-4 py-2 text-slate-800 dark:text-slate-100 mt-4">Finanční výsledek hospodaření</td></tr>

                                        {/* Fin Revenues */}
                                        {data.financial.revenues.map((g: any) => (
                                            <ReportGroupSection key={g.id} group={g} currencyFormat={currencyFormat} />
                                        ))}
                                        {/* Fin Costs */}
                                        {data.financial.costs.map((g: any) => (
                                            <ReportGroupSection key={g.id} group={g} isCost currencyFormat={currencyFormat} />
                                        ))}

                                        {/* Financial Result Summary */}
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                                            <td className="px-4 py-2 text-slate-900 dark:text-white">
                                                * Finanční výsledek hospodaření
                                            </td>
                                            <td className="px-4 py-2 text-right text-slate-900 dark:text-white">
                                                {currencyFormat(data.financial.result)}
                                            </td>
                                        </tr>

                                        {/* INCOME TAX */}
                                        <tr className="bg-slate-100 dark:bg-slate-800 font-bold"><td colSpan={2} className="px-4 py-2 text-slate-800 dark:text-slate-100 mt-4">Daň z příjmů</td></tr>
                                        {data.tax.costs.map((g: any) => (
                                            <ReportGroupSection key={g.id} group={g} isCost currencyFormat={currencyFormat} />
                                        ))}

                                        {/* GRAND TOTAL */}
                                        <tr className="bg-amber-50 dark:bg-amber-900/20 font-bold border-t-2 border-amber-200 dark:border-amber-700 text-lg">
                                            <td className="px-4 py-3 text-amber-900 dark:text-amber-100">
                                                ** Výsledek hospodaření za účetní období
                                            </td>
                                            <td className="px-4 py-3 text-right text-amber-900 dark:text-amber-100">
                                                {currencyFormat(data.results.afterTax)}
                                            </td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ReportGroupSection({ group, isCost = false, currencyFormat }: { group: any, isCost?: boolean, currencyFormat: (val: number) => string }) {
    return (
        <>
            {/* Group Header */}
            <tr className="bg-slate-50/80 dark:bg-slate-800/30 font-semibold text-slate-700 dark:text-slate-300">
                <td className="px-4 py-1.5 ">
                    {group.name}
                </td>
                <td className="px-4 py-1.5 text-right">
                    {/* Costs shown as negative in group header for clarity? Or strictly standard positive? Standard shows Costs as positive numbers in column, but mathematically they are minus. Let's show as positive with sign if needed, or just abs. */}
                    {isCost ? '-' : ''}{currencyFormat(group.balance)}
                </td>
            </tr>
            {/* Group Items */}
            {group.accounts.map((item: any) => (
                <tr key={item.account} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-1 pl-8 font-mono text-slate-600 dark:text-slate-400 text-xs">
                        {item.account} - {item.name}
                    </td>
                    <td className="px-4 py-1 text-right font-medium text-slate-600 dark:text-slate-400 text-xs">
                        {currencyFormat(item.balance)}
                    </td>
                </tr>
            ))}
        </>
    );
}
