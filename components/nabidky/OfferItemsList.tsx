'use client';

import { NabidkaPolozka } from '@/lib/types/nabidky-types';
import { deleteOfferItem } from '@/lib/api/nabidky-api';

interface OfferItemsListProps {
    items: NabidkaPolozka[];
    nabidkaId: number;
    onRefresh: () => void;
}

export default function OfferItemsList({ items, nabidkaId, onRefresh }: OfferItemsListProps) {
    const handleDelete = async (id: number) => {
        if (!confirm('Opravdu smazat položku?')) return;
        try {
            await deleteOfferItem(id, nabidkaId);
            onRefresh();
        } catch (error) {
            console.error(error);
            alert('Chyba při mazání položky.');
        }
    };

    const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

    if (items.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl bg-gray-50 dark:bg-slate-900/50">
                Žádné položky k zobrazení. Přidejte první položku.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white font-semibold">
                    <tr>
                        <th className="px-4 py-3">Název</th>
                        <th className="px-4 py-3 w-32">Typ</th>
                        <th className="px-4 py-3 text-right w-24">Mn.</th>
                        <th className="px-4 py-3 text-right w-32">Cena/ks</th>
                        <th className="px-4 py-3 text-right w-32">Celkem</th>
                        <th className="px-4 py-3 w-16"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.nazev}</td>
                            <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-400">{item.typ}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{item.mnozstvi}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{currency.format(item.cena_ks)}</td>
                            <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-900 dark:text-white">{currency.format(item.celkem)}</td>
                            <td className="px-4 py-3 text-right">
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
