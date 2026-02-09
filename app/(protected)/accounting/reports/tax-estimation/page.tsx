"use client"

import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Landmark, Wallet, AlertCircle } from "lucide-react";
import { getErrorMessage } from '@/lib/errors';

export default function TaxEstimationPage() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount);
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/accounting/reports/tax-estimation?year=${year}`);
            if (!res.ok) throw new Error('Failed to fetch tax estimation');
            const json = await res.json();
            setData(json);
        } catch (e: unknown) {
            setError(getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [year]);

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

    if (!data) return null;

    const { vat, dppo } = data;
    const totalToSetAside = Math.max(0, vat.net) + Math.max(0, dppo.estimatedTax);

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                        Daňové Odhady {year}
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Předběžný výpočet daňové povinnosti (DPH a DPPO)
                    </p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                </div>
            </div>

            {/* Top Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-xl p-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-white/90">Celkem odložit</h3>
                        <Wallet className="h-5 w-5 opacity-80" />
                    </div>
                    <div className="text-indigo-100 text-sm mb-4">
                        Odhadovaná částka k úhradě státu
                    </div>
                    <div>
                        <div className="text-4xl font-bold mb-2">{formatCurrency(totalToSetAside)}</div>
                        <div className="text-sm opacity-80">
                            DPH + Daň z příjmu PO
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* VAT Section */}
                <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold">DPH (Daň z přidané hodnoty)</h3>
                    </div>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                <span className="text-sm text-slate-500 font-medium">Vybráno (Výstup)</span>
                                <div className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">{formatCurrency(vat.output)}</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                <span className="text-sm text-slate-500 font-medium">Uplatněno (Vstup)</span>
                                <div className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">{formatCurrency(vat.input)}</div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-600 dark:text-slate-400">Výsledek DPH</span>
                                <span className={`text-2xl font-bold ${vat.net > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {vat.net > 0 ? 'K úhradě' : 'Nadměrný odpočet'}: {formatCurrency(Math.abs(vat.net))}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DPPO Section */}
                <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <Landmark className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-lg font-semibold">DPPO (Daň z příjmu PO)</h3>
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Výnosy</span>
                                <span className="font-medium">{formatCurrency(dppo.revenues)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Náklady</span>
                                <span className="font-medium">-{formatCurrency(dppo.expenses)}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                                <span className="text-slate-700 dark:text-slate-300 font-medium">Hospodářský výsledek</span>
                                <span className="font-bold">{formatCurrency(dppo.accountingProfit)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-amber-600">
                                <span>+ Nedaňové náklady (513)</span>
                                <span>+{formatCurrency(dppo.nonDeductible)}</span>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Odhadovaný základ daně</span>
                                <span className="font-bold text-amber-800 dark:text-amber-200">{formatCurrency(dppo.taxBase)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-amber-200 dark:border-amber-800/50">
                                <span className="text-sm text-amber-700 dark:text-amber-300 font-bold">Odhadovaná daň ({dppo.rate * 100}%)</span>
                                <span className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(dppo.estimatedTax)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-3 border border-blue-100 dark:border-blue-800">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    <strong>Upozornění:</strong> Jedná se o hrubý odhad na základě účetnictví. Pro přesný výpočet kontaktujte daňového poradce. Výpočet nezahrnuje uplatnění ztrát z minulých let, slevy na dani, investiční pobídky ani jiné specifické úpravy základu daně.
                </p>
            </div>
        </div>
    );
}
