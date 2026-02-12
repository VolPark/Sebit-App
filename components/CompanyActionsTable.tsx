import { ActionStats } from '@/lib/dashboard';
import { getMaterialConfig } from '@/lib/material-config';
import { useState, useMemo } from 'react';

const CompanyActionsTable = ({ data, onActionClick }: { data: ActionStats[], onActionClick: (action: ActionStats) => void }) => {
    const [sortConfig, setSortConfig] = useState<{ key: keyof ActionStats; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

    const requestSort = (key: keyof ActionStats) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        const sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                // Handle string comparisons
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'asc'
                        ? aValue.localeCompare(bValue, 'cs')
                        : bValue.localeCompare(aValue, 'cs');
                }

                // Handle boolean (isCompleted)
                if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                    // false (active) < true (completed)
                    return sortConfig.direction === 'asc'
                        ? (Number(aValue) - Number(bValue))
                        : (Number(bValue) - Number(aValue));
                }

                // Handle numbers
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const currency = (val: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val);
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('cs-CZ');
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                Detailní výpis akcí
                <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{data.length}</span>
            </h3>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-b dark:border-slate-700">
                        <tr>
                            <th className="p-3 whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('date')}>
                                <div className="flex items-center gap-1">Datum {sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('name')}>
                                <div className="flex items-center gap-1">Akce {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('clientName')}>
                                <div className="flex items-center gap-1">Klient {sortConfig?.key === 'clientName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('totalHours')}>
                                <div className="flex items-center justify-end gap-1">Hodiny {sortConfig?.key === 'totalHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('revenue')}>
                                <div className="flex items-center justify-end gap-1">Příjmy {sortConfig?.key === 'revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('totalCost')}>
                                <div className="flex items-center justify-end gap-1 group relative">
                                    Náklady {sortConfig?.key === 'totalCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    <span className="invisible group-hover:visible absolute right-0 top-full mt-1 w-48 bg-slate-800 text-white text-xs p-2 rounded shadow-lg z-50 font-normal normal-case">
                                        {getMaterialConfig().isVisible
                                            ? `${getMaterialConfig().label} + Mzdy + Režie`
                                            : 'Mzdy + Režie'
                                        }
                                    </span>
                                </div>
                            </th>
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('profit')}>
                                <div className="flex items-center justify-end gap-1">Zisk {sortConfig?.key === 'profit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('margin')}>
                                <div className="flex items-center justify-end gap-1">Marže {sortConfig?.key === 'margin' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {sortedData.map(action => (
                            <tr key={action.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors" onClick={() => onActionClick(action)}>
                                <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(action.date)}</td>
                                <td className="p-3 font-medium text-slate-900 dark:text-white">
                                    <div className="flex items-center gap-2">
                                        <span className={action.isCompleted ? 'line-through text-gray-400' : ''}>{action.name}</span>
                                        {action.isCompleted && <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500 px-1.5 py-0.5 rounded">Dokončeno</span>}
                                    </div>
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-300">{action.clientName}</td>
                                <td className="p-3 text-right text-slate-600 dark:text-slate-400">{action.totalHours.toLocaleString('cs-CZ')} h</td>
                                <td className="p-3 text-right font-medium text-slate-700 dark:text-slate-200">{currency(action.revenue)}</td>
                                <td className="p-3 text-right text-red-600/80 dark:text-red-400/80" title={
                                    getMaterialConfig().isVisible
                                        ? `${getMaterialConfig().label}: ${currency(action.materialCost)}, Mzdy: ${currency(action.laborCost)}, Režie: ${currency(action.overheadCost)}`
                                        : `Mzdy: ${currency(action.laborCost)}, Režie: ${currency(action.overheadCost)}`
                                }>
                                    {currency(action.totalCost)}
                                </td>
                                <td className={`p-3 text-right font-bold ${action.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {currency(action.profit)}
                                </td>
                                <td className={`p-3 text-right ${action.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {action.margin.toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                        {sortedData.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400 italic">
                                    Žádné akce k zobrazení
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards (Simplified) */}
            <div className="md:hidden space-y-3">
                {sortedData.map(action => (
                    <div key={action.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 cursor-pointer active:scale-[0.98] transition-all" onClick={() => onActionClick(action)}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="text-xs text-slate-400 mb-0.5">{formatDate(action.date)} • {action.clientName}</div>
                                <h4 className={`font-bold ${action.isCompleted ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>{action.name}</h4>
                            </div>
                            <div className="text-right">
                                <span className={`font-bold block ${action.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currency(action.profit)}</span>
                                <span className="text-xs text-slate-500">Zisk</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                            <span className="text-slate-600">Příjmy: {currency(action.revenue)}</span>
                            <span className={`font-medium ${action.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{action.margin.toFixed(1)}% Marže</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CompanyActionsTable;
