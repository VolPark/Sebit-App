'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface BankMovement {
    bank_movement_id: number;
    amount: number;
    currency: any;
    date: string; // or items[0].date
    note: string;
    variable_symbol: string;
    contact?: { contact_id: string };
    items: any[];
    created_at: string;
}

export default function BankAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params); // React 19 / Next 15 convention for async params
    // In strict Next 14, params is not a promise, but in 15 it is. 
    // If build fails allow standard props access.
    // Let's assume params is standard object for now or handle both.
    // Actually provided compiler context said Next 16.1.1. So likely async params.

    const [movements, setMovements] = useState<BankMovement[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/accounting/reports/bank-accounts/${id}/movements`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch movements');

            // Extract items
            // API returns { items: [...], _meta: ... }
            if (data.items) {
                setMovements(data.items);
            } else {
                setMovements([]);
            }
        } catch (e: any) {
            console.error(e);
            toast.error('Chyba při načítání pohybů: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMovements();
    }, [id]);

    const formatCurrency = (amount: number, currency: any) => {
        let currencyCode = 'CZK';
        if (typeof currency === 'string') currencyCode = currency;
        else if (currency?.currency_id) currencyCode = currency.currency_id;

        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: currencyCode }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('cs-CZ');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/accounting/reports" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Pohyby na účtu
                        </h1>
                        <p className="text-sm text-slate-500 font-mono">{id}</p>
                    </div>
                </div>
                <button
                    onClick={fetchMovements}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Aktualizovat
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-4 py-3 font-medium">Datum</th>
                                <th className="px-4 py-3 font-medium">Popis</th>
                                <th className="px-4 py-3 font-medium">Protiúčet/VS</th>
                                <th className="px-4 py-3 font-medium text-right">Částka</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading && movements.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">Načítám pohyby...</td>
                                </tr>
                            ) : movements.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">Žádné pohyby.</td>
                                </tr>
                            ) : (
                                movements.map((m) => {
                                    // Generally items[0] has date detail. m.date often undefined in wrapper.
                                    // User JSON shows m.items[0].date
                                    const detail = m.items && m.items.length > 0 ? m.items[0] : {};
                                    const date = detail.date || m.created_at;
                                    const amount = parseFloat(m.amount as any);

                                    return (
                                        <tr key={m.bank_movement_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {formatDate(date)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 max-w-xs truncate text-slate-900 dark:text-white" title={m.note}>
                                                {m.note || detail.note || '-'}
                                                {m.contact?.contact_id && (
                                                    <div className="text-xs text-slate-500 mt-0.5">{m.contact.contact_id}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                                                {m.variable_symbol && <div>VS: {m.variable_symbol}</div>}
                                                {detail.payment_rule?.payment_rule_id && (
                                                    <div className="text-slate-400">{detail.payment_rule.payment_rule_id}</div>
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                <div className="flex items-center justify-end gap-1">
                                                    {amount < 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                                    {formatCurrency(amount, m.currency)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
