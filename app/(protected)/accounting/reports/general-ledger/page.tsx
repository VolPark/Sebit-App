'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, RefreshCw, Filter, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { PdfDownloadButton } from '@/components/accounting/reports/PdfDownloadButton';
import { GeneralLedgerPdf } from '@/components/accounting/reports/GeneralLedgerPdf';
import { getErrorMessage } from '@/lib/errors';

export default function GeneralLedgerPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    // Expanded state now tracks hierarchy keys: "class-X", "group-XY", "synth-XYZ", "acc-XYZABC"
    // By default, we might simply show everything expanded or allow toggling. 
    // For now, let's auto-expand distinct levels or allow simple toggling of accounts?
    // User request screenshot implies a full report view. Let's keep account toggle for transactions.
    const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                year: String(year)
            });
            const res = await fetch(`/api/accounting/reports/general-ledger?${params}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch');

            setAccounts(data.items || []);
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

    const toggleExpand = (accCode: string) => {
        setExpandedAccount(expandedAccount === accCode ? null : accCode);
    };

    // Grouping Logic
    const groupedData = (() => {
        const classes: Record<string, any> = {};

        accounts.forEach(acc => {
            const classCode = acc.account.substring(0, 1);
            const groupCode = acc.account.substring(0, 2);
            const synthCode = acc.account.substring(0, 3);

            if (!classes[classCode]) classes[classCode] = { code: classCode, groups: {}, initial: 0, md: 0, d: 0, final: 0 };
            const cls = classes[classCode];

            if (!cls.groups[groupCode]) cls.groups[groupCode] = { code: groupCode, synths: {}, initial: 0, md: 0, d: 0, final: 0 };
            const grp = cls.groups[groupCode];

            if (!grp.synths[synthCode]) grp.synths[synthCode] = { code: synthCode, accounts: [], initial: 0, md: 0, d: 0, final: 0 };
            const synth = grp.synths[synthCode];

            // Add Account
            synth.accounts.push(acc);

            // Accumulate Sums
            [synth, grp, cls].forEach(level => {
                level.initial += acc.initial;
                level.md += acc.md;
                level.d += acc.d;
                level.final += acc.final;
            });
        });

        // Convert to Arrays and Sort
        return Object.values(classes).sort((a: any, b: any) => a.code.localeCompare(b.code)).map((cls: any) => ({
            ...cls,
            groups: Object.values(cls.groups).sort((a: any, b: any) => a.code.localeCompare(b.code)).map((grp: any) => ({
                ...grp,
                synths: Object.values(grp.synths).sort((a: any, b: any) => a.code.localeCompare(b.code))
            }))
        }));
    })();

    return (
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/accounting?tab=reports" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Hlavní kniha</h1>
                        <p className="text-muted-foreground text-slate-500">Účetní rok {year}</p>
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
                        onClick={fetchRecords}
                        className="p-2 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title="Obnovit"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {groupedData.length > 0 && (
                        <PdfDownloadButton
                            document={<GeneralLedgerPdf data={groupedData} year={year} />}
                            fileName={`HlavniKniha_${year}.pdf`}
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
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Účet</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Název účtu</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-right">Počáteční stav</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-right">Obrat MD</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-right">Obrat D</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-right">Konečný zůstatek</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {accounts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        {loading ? 'Načítám data...' : 'Žádná data k zobrazení'}
                                    </td>
                                </tr>
                            ) : (
                                groupedData.map((cls: any) => (
                                    <React.Fragment key={`class-${cls.code}`}>
                                        {/* CLASS HEADER */}
                                        <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700">
                                            <td colSpan={6} className="px-6 py-2 font-bold text-slate-800 dark:text-slate-100">
                                                Třída {cls.code}
                                            </td>
                                        </tr>

                                        {cls.groups.map((grp: any) => (
                                            <React.Fragment key={`group-${grp.code}`}>
                                                {/* GROUP HEADER */}
                                                <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                                                    <td colSpan={6} className="px-6 py-2 font-semibold text-slate-700 dark:text-slate-200">
                                                        Skupina {grp.code}
                                                    </td>
                                                </tr>

                                                {grp.synths.map((synth: any) => (
                                                    <React.Fragment key={`synth-${synth.code}`}>
                                                        {/* SYNTH HEADER */}
                                                        <tr className="bg-slate-50/30 dark:bg-slate-800/10">
                                                            <td colSpan={6} className="px-6 py-1.5 font-medium text-slate-600 dark:text-slate-300 pl-8">
                                                                Syntetický účet {synth.code}
                                                            </td>
                                                        </tr>

                                                        {/* ACCOUNTS */}
                                                        {synth.accounts.map((acc: any) => (
                                                            <React.Fragment key={acc.account}>
                                                                <tr
                                                                    onClick={() => toggleExpand(acc.account)}
                                                                    className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group border-b border-slate-100 dark:border-slate-800/30"
                                                                >
                                                                    <td className="px-6 py-3 font-mono font-medium text-slate-900 dark:text-slate-200 pl-12">
                                                                        {acc.account}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300">
                                                                        {acc.name}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right font-mono text-slate-500">
                                                                        {currencyFormat(acc.initial)}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                                                        {currencyFormat(acc.md)}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                                                        {currencyFormat(acc.d)}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right font-bold text-slate-900 dark:text-white">
                                                                        {currencyFormat(acc.final)}
                                                                    </td>
                                                                </tr>

                                                                {/* TRANSACTIONS */}
                                                                {expandedAccount === acc.account && (
                                                                    <tr className="bg-slate-50 dark:bg-slate-900/50 shadow-inner">
                                                                        <td colSpan={6} className="px-0 py-0">
                                                                            <div className="py-4 pl-16 pr-6">
                                                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                                                    <table className="w-full text-xs">
                                                                                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                                                            <tr>
                                                                                                <th className="px-4 py-2 text-left">Datum</th>
                                                                                                <th className="px-4 py-2 text-left">Doklad</th>
                                                                                                <th className="px-4 py-2 text-left">Text</th>
                                                                                                <th className="px-4 py-2 text-right">Částka (MD/D)</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                                                                            {acc.transactions.length === 0 ? (
                                                                                                <tr><td colSpan={4} className="p-4 text-center text-slate-400">Žádné pohyby</td></tr>
                                                                                            ) : (
                                                                                                acc.transactions.map((tx: any) => (
                                                                                                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                                                                                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                                                                                                            {new Date(tx.date).toLocaleDateString('cs-CZ')}
                                                                                                        </td>
                                                                                                        <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">
                                                                                                            {tx.uol_id}
                                                                                                        </td>
                                                                                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400 break-words max-w-[300px]">
                                                                                                            {tx.text}
                                                                                                        </td>
                                                                                                        <td className={`px-4 py-2 text-right font-mono font-medium ${tx.side === 'md' ? 'text-emerald-600' : 'text-amber-600'
                                                                                                            }`}>
                                                                                                            {tx.side === 'md' ? 'MD ' : 'D '}
                                                                                                            {currencyFormat(Number(tx.amount))}
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                ))
                                                                                            )}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        ))}

                                                        {/* SYNTH TOTAL */}
                                                        <tr className="bg-slate-50/50 dark:bg-slate-800/10 font-bold text-slate-500 text-xs border-b border-slate-100 dark:border-slate-800/50">
                                                            <td className="px-6 py-2 text-right uppercase" colSpan={2}>Celkem ({synth.code})</td>
                                                            <td className="px-6 py-2 text-right">{currencyFormat(synth.initial)}</td>
                                                            <td className="px-6 py-2 text-right">{currencyFormat(synth.md)}</td>
                                                            <td className="px-6 py-2 text-right">{currencyFormat(synth.d)}</td>
                                                            <td className="px-6 py-2 text-right">{currencyFormat(synth.final)}</td>
                                                        </tr>
                                                    </React.Fragment>
                                                ))}

                                                {/* GROUP TOTAL */}
                                                <tr className="bg-slate-100/50 dark:bg-slate-800/40 font-bold text-slate-600 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-700">
                                                    <td className="px-6 py-2 text-right" colSpan={2}>Skupina {grp.code} celkem</td>
                                                    <td className="px-6 py-2 text-right">{currencyFormat(grp.initial)}</td>
                                                    <td className="px-6 py-2 text-right">{currencyFormat(grp.md)}</td>
                                                    <td className="px-6 py-2 text-right">{currencyFormat(grp.d)}</td>
                                                    <td className="px-6 py-2 text-right">{currencyFormat(grp.final)}</td>
                                                </tr>
                                            </React.Fragment>
                                        ))}

                                        {/* CLASS TOTAL */}
                                        <tr className="bg-slate-200/50 dark:bg-slate-800/80 font-bold text-slate-800 dark:text-slate-200 text-sm border-t-2 border-slate-300 dark:border-slate-600 mb-4 block-row">
                                            <td className="px-6 py-3 text-right" colSpan={2}>Třída {cls.code} celkem</td>
                                            <td className="px-6 py-3 text-right">{currencyFormat(cls.initial)}</td>
                                            <td className="px-6 py-3 text-right">{currencyFormat(cls.md)}</td>
                                            <td className="px-6 py-3 text-right">{currencyFormat(cls.d)}</td>
                                            <td className="px-6 py-3 text-right">{currencyFormat(cls.final)}</td>
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
