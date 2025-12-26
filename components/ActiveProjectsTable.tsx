import { ProjectHealthStats } from '@/lib/dashboard';

const ActiveProjectsTable = ({ data }: { data: ProjectHealthStats[] }) => {
    return (
        <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-b dark:border-slate-700">
                        <tr>
                            <th className="p-4 whitespace-nowrap">Projekt / Akce</th>
                            <th className="p-4 whitespace-nowrap">Klient</th>
                            <th className="p-4 text-center whitespace-nowrap">Termín</th>
                            <th className="p-4 text-right whitespace-nowrap">Bilance (h)</th>
                            <th className="p-4 whitespace-nowrap">Stav (Hodiny)</th>
                            <th className="p-4 text-right whitespace-nowrap group relative cursor-help">
                                <span>WIP (Kč)</span>
                                <span className="invisible group-hover:visible absolute right-0 top-full mt-1 w-64 bg-slate-800 text-white text-xs p-2 rounded shadow-lg z-50">
                                    Hodnota rozpracované výroby = (Odpracované hodiny * Sazba pracovníka) + Materiál
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {data.map((p) => {
                            const hoursOver = p.totalActualHours - p.totalEstimatedHours;
                            return (
                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-900 dark:text-white">{p.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{p.clientName}</td>
                                    <td className="p-4 text-center text-slate-500">{p.lastActivity ? new Date(p.lastActivity).toLocaleDateString('cs-CZ') : '-'}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`font-bold ${hoursOver > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                {hoursOver > 0 ? '+' : ''}{hoursOver.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} h
                                            </span>
                                            <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${p.status === 'critical' ? 'bg-red-500' : p.status === 'warning' ? 'bg-orange-400' : 'bg-green-500'}`}
                                                    style={{ width: `${Math.min(p.budgetUsage * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-base font-bold text-slate-900 dark:text-white">
                                                {p.totalActualHours.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} / {p.totalEstimatedHours.toLocaleString('cs-CZ')} h
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${p.status === 'critical' ? 'bg-red-500 animate-pulse' : p.status === 'warning' ? 'bg-orange-400' : 'bg-green-500'}`}></span>
                                                <span className={`text-xs font-medium ${p.status === 'critical' ? 'text-red-700 dark:text-red-400' : p.status === 'warning' ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>
                                                    {p.status === 'critical' ? 'Kritický' : p.status === 'warning' ? 'Varování' : 'OK'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(p.wipValue)}
                                            </span>
                                            <span className="text-[10px] text-slate-400 whitespace-nowrap" title={`Mzdy: ${p.laborCost.toLocaleString('cs-CZ')} Kč, Materiál: ${p.materialCost.toLocaleString('cs-CZ')} Kč`}>
                                                Mzdy {new Intl.NumberFormat('cs-CZ', { notation: 'compact', maximumFractionDigits: 1 }).format(p.laborCost)} + Mat. {new Intl.NumberFormat('cs-CZ', { notation: 'compact', maximumFractionDigits: 1 }).format(p.materialCost)}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    Žádné aktivní projekty
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {data.map((p) => {
                    const hoursOver = p.totalActualHours - p.totalEstimatedHours;
                    return (
                        <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">{p.name}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{p.clientName}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${p.status === 'critical' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' :
                                    p.status === 'warning' ? 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30' :
                                        'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                                    }`}>
                                    {p.status === 'critical' ? 'Kritický' : p.status === 'warning' ? 'Varování' : 'OK'}
                                </span>
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-500">Bilance (h)</span>
                                    <span className={`font-bold ${hoursOver > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                        {hoursOver > 0 ? '+' : ''}{hoursOver.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} h
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${p.status === 'critical' ? 'bg-red-500' : p.status === 'warning' ? 'bg-orange-400' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(p.budgetUsage * 100, 100)}%` }}
                                    ></div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Odhad vs. Realita</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`font-bold text-lg ${p.status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                                                {p.totalActualHours.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })}h
                                            </span>
                                            <span className="text-sm text-slate-400">/ {p.totalEstimatedHours.toLocaleString('cs-CZ')}h</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-1 mb-1">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">WIP Hodnota</p>
                                        </div>
                                        <p className="font-bold text-slate-900 dark:text-white">{new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(p.wipValue)}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            Mzdy {new Intl.NumberFormat('cs-CZ', { notation: 'compact', maximumFractionDigits: 1 }).format(p.laborCost)} + Mat. {new Intl.NumberFormat('cs-CZ', { notation: 'compact', maximumFractionDigits: 1 }).format(p.materialCost)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {data.length === 0 && (
                    <div className="p-8 text-center text-gray-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
                        Žádné aktivní projekty
                    </div>
                )}
            </div>
        </>
    );
};

export default ActiveProjectsTable;
