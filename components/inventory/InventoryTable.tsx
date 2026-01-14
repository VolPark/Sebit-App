'use client';

import { useState, useEffect } from 'react';
import { InventoryItem, InventoryCenter, getCenters } from '@/lib/api/inventory-api';
import Link from 'next/link';

type InventoryTableProps = {
    items: InventoryItem[];
    loading?: boolean;
    onDataChanged: () => void;
    onStatsCalculated?: (stats: { totalValue: number, totalItems: number }) => void;
    onAction: (type: 'RECEIPT' | 'ISSUE') => void;
};

export default function InventoryTable({ items, loading, onDataChanged, onStatsCalculated, onAction }: InventoryTableProps) {
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null); // For future use (e.g. quick edit)

    // Filters
    const [filter, setFilter] = useState('');
    const [centers, setCenters] = useState<InventoryCenter[]>([]);
    const [selectedCenterId, setSelectedCenterId] = useState<number | 'ALL'>('ALL');

    // Filter Logic
    const [filteredItems, setFilteredItems] = useState<InventoryItem[]>(items);

    useEffect(() => {
        getCenters().then(setCenters).catch(console.error);
    }, []);

    useEffect(() => {
        let result = items;

        // 1. Filter by Search Text
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            result = result.filter(item =>
                item.name.toLowerCase().includes(lowerFilter) ||
                (item.ean && item.ean.includes(filter)) ||
                (item.sku && item.sku.toLowerCase().includes(lowerFilter))
            );
        }

        // 2. Filter by Center
        if (selectedCenterId !== 'ALL') {
            result = result.filter(item => {
                const stock = item.stocks?.find(s => s.center_id === Number(selectedCenterId));
                return stock && stock.quantity > 0;
            });
        }

        setFilteredItems(result);

        // Calculate Stats
        // IMPORTANT: If center is selected, we should calculate stats based on THAT center's quantity/value?
        // Let's assume stats should reflect filter.
        let val = 0;
        let count = 0;

        result.forEach(item => {
            let qty = item.quantity;
            if (selectedCenterId !== 'ALL') {
                const stock = item.stocks?.find(s => s.center_id === Number(selectedCenterId));
                qty = stock ? stock.quantity : 0;
            }
            val += (qty * (item.avg_price || 0));
            count += qty;
        });

        if (onStatsCalculated) {
            onStatsCalculated({ totalValue: val, totalItems: count });
        }

    }, [items, filter, selectedCenterId, onStatsCalculated]);

    // Helper to get displayed quantity
    const getDisplayQuantity = (item: InventoryItem) => {
        if (selectedCenterId === 'ALL') return item.quantity;
        const stock = item.stocks?.find(s => s.center_id === Number(selectedCenterId));
        return stock ? stock.quantity : 0;
    };

    if (loading && items.length === 0) return <div className="text-center py-10 text-gray-500">Načítám sklad...</div>;
    if (items.length === 0 && !filter && selectedCenterId === 'ALL') return <div className="text-center py-10 text-gray-500">Sklad je prázdný</div>;

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Hledat podle názvu, EAN, SKU..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Center Filter */}
                <div className="md:w-64">
                    <select
                        value={selectedCenterId}
                        onChange={(e) => setSelectedCenterId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                        className="w-full pl-4 pr-10 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none"
                    >
                        <option value="ALL">Všechna střediska</option>
                        {centers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => onAction('RECEIPT')}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Příjem
                    </button>
                    <button
                        onClick={() => onAction('ISSUE')}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
                        Výdej
                    </button>
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
                                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-bold text-right">
                                        {getDisplayQuantity(item)} {item.unit}
                                    </td>
                                    <td className="px-6 py-4 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                        {item.avg_price?.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs text-right">
                                        {((getDisplayQuantity(item)) * (item.avg_price || 0)).toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })}
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
