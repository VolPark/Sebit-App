'use client';

import { useState, useEffect } from 'react';
import { getInventoryItems, InventoryItem } from '@/lib/api/inventory-api';
import Link from 'next/link';

type InventoryTableProps = {
    onStatsCalculated?: (stats: { totalValue: number; totalItems: number }) => void;
};

export default function InventoryTable({ onStatsCalculated }: InventoryTableProps) {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            const data = await getInventoryItems();
            setItems(data);
            setFilteredItems(data); // Init filtered items
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const lower = filter.toLowerCase();
        const result = items.filter(i =>
            i.name.toLowerCase().includes(lower) ||
            (i.ean && i.ean.includes(filter)) ||
            (i.sku && i.sku.toLowerCase().includes(lower))
        );
        setFilteredItems(result);

        // Calculate and emit stats
        if (onStatsCalculated) {
            const totalValue = result.reduce((sum, i) => sum + (i.quantity * (i.avg_price || 0)), 0);
            const totalItems = result.length;
            onStatsCalculated({ totalValue, totalItems });
        }
    }, [items, filter, onStatsCalculated]);

    if (loading) return <div className="text-center py-10 text-gray-500">Načítám sklad...</div>;

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Hledat položky (Název, EAN, SKU)..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-950/50 border-b border-gray-100 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200">Název</th>
                            <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200 text-right">Množství</th>
                            <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200 text-right">Cena Ø</th>
                            <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200 text-right">Hodnota</th>
                            <th className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-200 text-right">Akce</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    {filter ? 'Žádné položky nenalezeny' : 'Sklad je prázdný'}
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                                        <div className="text-xs text-gray-500 flex gap-2">
                                            {item.sku && <span>SKU: {item.sku}</span>}
                                            {item.ean && <span>EAN: {item.ean}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-bold ${item.quantity <= item.min_quantity ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                            {item.quantity}
                                        </span>
                                        <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right tabular-nums text-gray-600 dark:text-gray-400">
                                        {item.avg_price?.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })}
                                    </td>
                                    <td className="px-6 py-4 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                                        {(item.quantity * item.avg_price)?.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/inventory/${item.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                                            Detail
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
