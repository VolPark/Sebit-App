'use client';

import { getInventoryItems, InventoryItem } from '@/lib/api/inventory-api';
import InventoryTable from '@/components/inventory/InventoryTable';
import InventoryActionModal from '@/components/inventory/InventoryActionModal';
import { useState, useEffect } from 'react';

export default function InventoryPage() {
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<'RECEIPT' | 'ISSUE' | null>(null);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalValue: 0, totalItems: 0, totalQuantity: 0 });

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await getInventoryItems();
            setItems(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const handleSuccess = () => {
        loadItems();
        setActionType(null);
        setActionModalOpen(false);
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Skladové hospodářství</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Přehled skladových zásob a pohybů</p>
                </div>

                {/* Stats Cards (Mobile Friendly) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Celková hodnota</div>
                        <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                            {stats.totalValue.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Položek</div>
                        <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalItems}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Celkové množství</div>
                        <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalQuantity} ks</div>
                    </div>
                </div>
            </div>

            <InventoryTable
                key={items.length}
                items={items}
                loading={loading}
                onDataChanged={loadItems}
                onStatsCalculated={setStats}
                onAction={(type) => {
                    setActionType(type);
                    setActionModalOpen(true);
                }}
            />

            {actionModalOpen && actionType && (
                <InventoryActionModal
                    isOpen={actionModalOpen}
                    type={actionType}
                    onClose={() => setActionModalOpen(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
}
