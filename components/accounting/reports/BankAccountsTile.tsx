'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export function BankAccountsTile() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAccounts = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await fetch('/api/accounting/reports/bank-accounts');
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch');

            setAccounts(data.items || []);
        } catch (e: any) {
            console.error(e);
            toast.error('Nezdařilo se načíst bankovní účty: ' + e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const currencyFormat = (val: number, curr: any) => {
        let currencyCode = 'CZK';
        if (typeof curr === 'string') {
            currencyCode = curr;
        } else if (curr && typeof curr === 'object' && curr.currency_id) {
            currencyCode = curr.currency_id;
        }

        try {
            return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: currencyCode }).format(val);
        } catch (e) {
            console.warn('Invalid currency code:', curr);
            return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Bankovní účty a pokladny</h3>
                        <p className="text-xs text-slate-500">Přehled aktuálních zůstatků</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchAccounts(true)}
                    disabled={refreshing || loading}
                    className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="p-0 flex-1 overflow-auto bg-white dark:bg-slate-900">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
                        <RefreshCw className="w-6 h-6 animate-spin opacity-50" />
                        <span className="text-sm">Aktualizuji data z banky...</span>
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-500">
                        Žádné účty nenalezeny.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {accounts.map((acc: any) => {
                            const balance = Number(acc.balance || acc.opening_balance || 0);
                            const isPositive = balance >= 0;

                            return (
                                <div key={acc.bank_account_id || acc.id} className="group relative hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-200">
                                    <Link href={`/accounting/reports/bank-accounts/${acc.bank_account_id || acc.id}`} className="absolute inset-0 z-10" />

                                    <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-0">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-semibold text-slate-900 dark:text-white truncate text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {acc.name || acc.bank_account || 'Bankovní účet'}
                                                </span>
                                                {acc.currency?.currency_id && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                                        {acc.currency.currency_id}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-mono">
                                                <span>{acc.bank_code ? `${acc.bank_account?.split('/')[0]}/${acc.bank_code}` : acc.bank_account}</span>
                                            </div>
                                        </div>

                                        <div className="text-left sm:text-right shrink-0">
                                            <div className={`text-xl font-bold tracking-tight whitespace-nowrap flex items-center sm:justify-end gap-2 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {isPositive ? <TrendingUp className="w-4 h-4 opacity-50" /> : <TrendingDown className="w-4 h-4 opacity-50" />}
                                                {currencyFormat(balance, acc.currency)}
                                            </div>
                                            <div className="text-xs text-slate-400 font-medium mt-0.5">
                                                {acc.balance !== undefined ? 'Aktuální zůstatek' : 'Počáteční stav'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Decoration line on hover */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer with last update info if needed */}
            {accounts.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/30 px-6 py-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 text-center uppercase tracking-wider font-semibold">
                        Synchronizováno s UOL
                    </p>
                </div>
            )}
        </div>
    );
}
