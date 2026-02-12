'use client';

import { useState, useMemo, Fragment } from 'react';
import { getMaterialConfig } from '@/lib/material-config';
import type { ClientStats, ActionStats } from '@/lib/dashboard';

interface ClientsTableProps {
    data: ClientStats[];
    onActionClick: (action: ActionStats) => void;
}

export function ClientsTable({ data, onActionClick }: ClientsTableProps) {
    const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: keyof ClientStats; direction: 'asc' | 'desc' } | null>(null);

    const toggleClient = (id: number) => {
        const newExpanded = new Set(expandedClients);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedClients(newExpanded);
    };

    const requestSort = (key: keyof ClientStats) => {
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

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'asc'
                        ? aValue.localeCompare(bValue, 'cs')
                        : bValue.localeCompare(aValue, 'cs');
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const currency = (val: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val);

    return (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-b dark:border-slate-700">
                        <tr>
                            <th className="p-3 whitespace-nowrap w-8"></th>
                            <th className="p-3 whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('name')}>
                                <div className="flex items-center gap-1">Klient {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('totalHours')}>
                                <div className="flex items-center justify-end gap-1">Hodiny {sortConfig?.key === 'totalHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('revenue')}>
                                <div className="flex items-center justify-end gap-1">Příjmy {sortConfig?.key === 'revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            {getMaterialConfig().isVisible && (
                                <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('materialCost')}>
                                    <div className="flex items-center justify-end gap-1">{getMaterialConfig().label} {sortConfig?.key === 'materialCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                </th>
                            )}
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('laborCost')}>
                                <div className="flex items-center justify-end gap-1">Mzdy {sortConfig?.key === 'laborCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('overheadCost')}>
                                <div className="flex items-center justify-end gap-1">Režie {sortConfig?.key === 'overheadCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('totalCost')}>
                                <div className="flex items-center justify-end gap-1">Náklady {sortConfig?.key === 'totalCost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('profit')}>
                                <div className="flex items-center justify-end gap-1">Zisk {sortConfig?.key === 'profit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                            <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors select-none" onClick={() => requestSort('margin')}>
                                <div className="flex items-center justify-end gap-1">Marže {sortConfig?.key === 'margin' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.map(c => (
                            <Fragment key={c.id}>
                                <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => toggleClient(c.id)}>
                                    <td className="p-3 text-center">
                                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                                className={`w-4 h-4 transform transition-transform ${expandedClients.has(c.id) ? 'rotate-90' : ''}`}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                            </svg>
                                        </button>
                                    </td>
                                    <td className="p-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                                    <td className="p-3 text-right font-medium dark:text-gray-200">{c.totalHours.toLocaleString('cs-CZ')} h</td>
                                    <td className="p-3 text-right font-medium dark:text-gray-200">{currency(c.revenue)}</td>
                                    {getMaterialConfig().isVisible && <td className="p-3 text-right text-gray-600 dark:text-gray-400">{currency(c.materialCost)}</td>}
                                    <td className="p-3 text-right text-gray-600 dark:text-gray-400">{currency(c.laborCost)}</td>
                                    <td className="p-3 text-right text-gray-600 dark:text-gray-400">{currency(c.overheadCost)}</td>
                                    <td className="p-3 text-right text-red-600 dark:text-red-400 font-medium">{currency(c.totalCost)}</td>
                                    <td className={`p-3 text-right font-bold ${c.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{currency(c.profit)}</td>
                                    <td className={`p-3 text-right ${c.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{c.margin.toFixed(1)}%</td>
                                </tr>
                                {expandedClients.has(c.id) && (
                                    <tr className="bg-gray-50/50 dark:bg-slate-800/30">
                                        <td colSpan={10} className="p-0">
                                            <div className="py-2 pl-4 pr-4 border-b border-gray-100 dark:border-slate-800 shadow-inner bg-gray-50 dark:bg-slate-900/50">
                                                <table className="w-full text-xs">
                                                    <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                                                        <tr>
                                                            <th className="py-2 pl-10 text-left font-medium uppercase tracking-wider">Akce</th>
                                                            <th className="py-2 text-right font-medium uppercase tracking-wider">Hodiny</th>
                                                            <th className="py-2 text-right font-medium uppercase tracking-wider">Příjmy</th>
                                                            {getMaterialConfig().isVisible && <th className="py-2 text-right font-medium uppercase tracking-wider">{getMaterialConfig().label}</th>}
                                                            <th className="py-2 text-right font-medium uppercase tracking-wider">Mzdy</th>
                                                            <th className="py-2 text-right font-medium uppercase tracking-wider">Režie</th>
                                                            <th className="py-2 text-right font-medium uppercase tracking-wider">Náklady</th>
                                                            <th className="py-2 text-right font-medium uppercase tracking-wider">Zisk</th>
                                                            <th className="py-2 text-right font-medium uppercase tracking-wider">Marže</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {c.actions.map(action => (
                                                            <tr key={action.id} className="hover:bg-gray-100/50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors" onClick={() => onActionClick(action)}>
                                                                <td className="py-2 pl-10 text-gray-700 dark:text-gray-300">
                                                                    <span className={action.isCompleted ? 'line-through text-gray-400' : ''}>{action.name}</span>
                                                                </td>
                                                                <td className="py-2 text-right text-gray-600 dark:text-gray-400">{action.totalHours.toLocaleString('cs-CZ')} h</td>
                                                                <td className="py-2 text-right text-gray-600 dark:text-gray-400">{currency(action.revenue)}</td>
                                                                {getMaterialConfig().isVisible && <td className="py-2 text-right text-gray-500 dark:text-gray-500">{currency(action.materialCost)}</td>}
                                                                <td className="py-2 text-right text-gray-500 dark:text-gray-500">{currency(action.laborCost)}</td>
                                                                <td className="py-2 text-right text-gray-500 dark:text-gray-500">{currency(action.overheadCost)}</td>
                                                                <td className="py-2 text-right text-red-500 dark:text-red-400">{currency(action.totalCost)}</td>
                                                                <td className={`py-2 text-right font-medium ${action.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{currency(action.profit)}</td>
                                                                <td className={`py-2 text-right ${action.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{action.margin.toFixed(1)}%</td>
                                                            </tr>
                                                        ))}
                                                        {c.actions.length === 0 && (
                                                            <tr>
                                                                <td colSpan={9} className="py-4 text-center text-gray-400 italic">Žádné akce pro toto období</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                        {sortedData.length === 0 && <tr><td colSpan={10} className="p-4 text-center text-gray-500">Žádná data</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {sortedData.map(c => {
                    const isExpanded = expandedClients.has(c.id);
                    return (
                        <div key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                            <div onClick={() => toggleClient(c.id)} className="flex justify-between items-start mb-4 cursor-pointer">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                        {c.name}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{c.totalHours.toLocaleString('cs-CZ')} hod</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold text-lg ${c.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {currency(c.profit)}
                                    </p>
                                    <p className="text-xs text-gray-400 uppercase font-semibold">Zisk</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Příjmy</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{currency(c.revenue)}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Náklady Celkem</p>
                                    <p className="font-semibold text-red-600 dark:text-red-400">{currency(c.totalCost)}</p>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/30 p-4 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b border-gray-200 dark:border-slate-700 pb-2">Rozpad Nákladů</h4>
                                    <div className="space-y-2 text-sm mb-4">
                                        {getMaterialConfig().isVisible && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">{getMaterialConfig().label}:</span>
                                                <span className="font-medium text-gray-900 dark:text-gray-200">{currency(c.materialCost)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Mzdy:</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-200">{currency(c.laborCost)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Režie:</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-200">{currency(c.overheadCost)}</span>
                                        </div>
                                    </div>

                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b border-gray-200 dark:border-slate-700 pb-2">Akce ({c.actions.length})</h4>
                                    <div className="space-y-3">
                                        {c.actions.map(action => (
                                            <div key={action.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer active:scale-[0.99] transition-all" onClick={() => onActionClick(action)}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`font-semibold text-sm ${action.isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-200'}`}>{action.name}</span>
                                                    <span className={`${action.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-bold text-sm`}>{currency(action.profit)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                                    <span>{action.totalHours.toLocaleString('cs-CZ')} hod</span>
                                                    <span>Marže: {action.margin.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        ))}
                                        {c.actions.length === 0 && <p className="text-xs text-gray-400 italic text-center">Žádné akce</p>}
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <span className="text-sm text-gray-500">Marže</span>
                                <span className={`font-bold ${c.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {c.margin.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    );
                })}
                {sortedData.length === 0 && (
                    <div className="p-8 text-center text-gray-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
                        Žádná data k zobrazení
                    </div>
                )}
            </div>
        </>
    );
}

export default ClientsTable;
