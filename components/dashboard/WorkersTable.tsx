'use client';

import { formatRate, getRateUnit, formatRateValue } from '@/lib/formatting';
import type { WorkerStats } from '@/lib/dashboard';

interface WorkersTableProps {
    data: WorkerStats[];
    onWorkerClick: (worker: WorkerStats) => void;
}

export function WorkersTable({ data, onWorkerClick }: WorkersTableProps) {
    return (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700 text-gray-600 dark:text-gray-400">
                        <tr>
                            <th className="p-4 whitespace-nowrap">Jméno</th>
                            <th className="p-4 text-right whitespace-nowrap">Odpracováno</th>
                            <th className="p-4 text-right whitespace-nowrap">Vyplaceno (Mzdy)</th>
                            <th className="p-4 text-right group relative cursor-help w-[180px]">
                                <div className="flex items-center justify-end gap-1">
                                    <span>Prům. sazba <span className="font-normal text-xs text-slate-500 block">({getRateUnit()})</span></span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 shrink-0">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                    </svg>
                                </div>
                                <div className="invisible group-hover:visible absolute right-0 top-full mt-1 w-72 bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl z-[100] font-normal text-left">
                                    <p className="font-semibold mb-1 border-b border-slate-600 pb-1">Fakturovaná sazba</p>
                                    <p className="mb-2 text-slate-300">Vážený průměr sjednaných sazeb na projektech.</p>
                                    <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50 font-mono text-[10px] text-slate-400">
                                        Příklad: (10h × 2000 Kč + 90h × 1000 Kč) / 100h = 1100 Kč/h
                                    </div>
                                </div>
                            </th>
                            <th className="p-4 text-right font-bold text-gray-800 dark:text-gray-200 group relative cursor-help w-[180px]">
                                <div className="flex items-center justify-end gap-1">
                                    <span>Reálná sazba <span className="font-normal text-xs text-slate-400 block">({getRateUnit()})</span></span>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 shrink-0">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                    </svg>
                                </div>
                                <div className="invisible group-hover:visible absolute right-0 top-full mt-1 w-72 bg-slate-800 text-white text-xs p-3 rounded-lg shadow-xl z-[100] font-normal text-left">
                                    <p className="font-semibold mb-1 border-b border-slate-600 pb-1">Nákladová sazba</p>
                                    <p className="mb-2 text-slate-300">Skutečné náklady na hodinu práce (včetně odvodů).</p>
                                    <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50 font-mono text-[10px] text-slate-400">
                                        Příklad: 80 000 Kč (Mzdy) / 160h (Odpracováno) = 500 Kč/h
                                    </div>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.map(w => (
                            <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors" onClick={() => onWorkerClick(w)}>
                                <td className="p-4 font-medium text-gray-900 dark:text-white">{w.name}</td>
                                <td className="p-4 text-right dark:text-gray-300">{w.totalHours.toLocaleString('cs-CZ')} h</td>
                                <td className="p-4 text-right dark:text-gray-300">{w.totalWages.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })}</td>
                                <td className="p-4 text-right text-gray-500 dark:text-gray-400">{formatRateValue(w.avgHourlyRate)}</td>
                                <td className="p-4 text-right font-bold text-gray-900 dark:text-white">{formatRateValue(w.realHourlyRate || 0)}</td>
                            </tr>
                        ))}
                        {data.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">Žádná data</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {data.map(w => (
                    <div key={w.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 cursor-pointer active:scale-[0.98] transition-all" onClick={() => onWorkerClick(w)}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{w.name}</h3>
                            <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {w.totalHours.toLocaleString('cs-CZ')} h
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Vyplaceno</p>
                                <p className="font-bold text-slate-900 dark:text-white">{w.totalWages.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1 font-semibold">Reálná sazba</p>
                                <p className="font-bold text-blue-700 dark:text-blue-300">{formatRate(w.realHourlyRate || 0)}</p>
                            </div>
                            <div className="col-span-2 text-center text-xs text-gray-400">
                                Sazba (Alokovaná): {formatRate(w.avgHourlyRate)}
                            </div>
                        </div>
                    </div>
                ))}
                {data.length === 0 && (
                    <div className="p-8 text-center text-gray-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
                        Žádná data k zobrazení
                    </div>
                )}
            </div>
        </>
    );
}

export default WorkersTable;
