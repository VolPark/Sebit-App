'use client';

import InventoryTable from '@/components/inventory/InventoryTable';
import InventoryActionModal from '@/components/inventory/InventoryActionModal';
import { useState } from 'react';

export default function InventoryPage() {
    const [actionType, setActionType] = useState<'RECEIPT' | 'ISSUE' | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [stats, setStats] = useState({ totalValue: 0, totalItems: 0 });

    const handleSuccess = () => {
        setRefreshKey(prev => prev + 1);
        setActionType(null);
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sklad</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Přehled skladových zásob a pohybů</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setActionType('RECEIPT')}
                        className="bg-[#E30613] hover:bg-[#C90510] text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-red-500/20"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        Příjem / Skenovat
                    </button>
                    <button
                        onClick={() => setActionType('ISSUE')}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl font-medium transition-colors"
                    >
                        Výdej
                    </button>
                </div>
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
            </div>

            <InventoryTable key={refreshKey} onStatsCalculated={setStats} />

            {!!actionType && (
                <InventoryActionModal
                    isOpen={true}
                    type={actionType}
                    onClose={() => setActionType(null)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    )
}
