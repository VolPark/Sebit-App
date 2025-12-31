import { ActionStats } from '@/lib/dashboard';
import { getMaterialConfig } from '@/lib/material-config';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface Props {
    action: ActionStats | null;
    onClose: () => void;
}

const ActionDetailModal = ({ action, onClose }: Props) => {
    if (!action) return null;

    const currency = (val: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val);

    return (
        <Transition appear show={!!action} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-slate-200 dark:border-slate-800">

                                {/* Header */}
                                <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            {action.name}
                                            {action.isCompleted && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Dokončeno</span>}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">{action.clientName} • {new Date(action.date).toLocaleDateString('cs-CZ')}</p>
                                    </div>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* KPI Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Příjmy</div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">{currency(action.revenue)}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Náklady</div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">{currency(action.totalCost)}</div>
                                    </div>
                                    <div className={`p-4 rounded-xl ${action.profit >= 0 ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
                                        <div className={`text-xs uppercase tracking-wide ${action.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Zisk</div>
                                        <div className={`text-lg font-bold mt-1 ${action.profit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{currency(action.profit)}</div>
                                    </div>
                                    <div className={`p-4 rounded-xl ${action.profit >= 0 ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
                                        <div className={`text-xs uppercase tracking-wide ${action.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Marže</div>
                                        <div className={`text-lg font-bold mt-1 ${action.profit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{action.margin.toFixed(1)}%</div>
                                    </div>
                                </div>

                                {/* Details Breakdown */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                    {/* Cost Breakdown */}
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">Detalní rozpad nákladů</h4>
                                        <div className="space-y-3">

                                            {/* Material */}
                                            {getMaterialConfig().isVisible && (
                                                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-lg">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-medium text-slate-700 dark:text-slate-200">{getMaterialConfig().label}</span>
                                                        <span className={`text-sm font-bold ${action.materialProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            Zisk ({getMaterialConfig().labelLowercase}): {currency(action.materialProfit || 0)}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <div className="text-slate-400 text-xs">Fakturace (Výnos)</div>
                                                            <div className="font-medium">{currency(action.materialRevenue || 0)}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-slate-400 text-xs">Nákup (Náklad)</div>
                                                            <div className="font-medium text-red-500">{currency(action.materialCost)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Wages */}
                                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-lg">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-medium text-slate-700 dark:text-slate-200">Mzdy</span>
                                                    <span className="font-bold text-red-500">{currency(action.laborCost)}</span>
                                                </div>
                                                <div className="text-xs text-slate-400">Celkem odpracováno: {action.totalHours.toLocaleString('cs-CZ')} h</div>
                                            </div>

                                            {/* Overhead */}
                                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-lg">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-medium text-slate-700 dark:text-slate-200">Režie</span>
                                                    <span className="font-bold text-slate-500">{currency(action.overheadCost)}</span>
                                                </div>
                                                <div className="text-xs text-slate-400">Fixní náklady firmy + divize</div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Workers List */}
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Pracovníci na zakázce</h4>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                                                    <tr>
                                                        <th className="p-3 text-left font-medium">Jméno</th>
                                                        <th className="p-3 text-right font-medium">Hodiny</th>
                                                        <th className="p-3 text-right font-medium">Náklad</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {action.workers && action.workers.length > 0 ? (
                                                        action.workers.map((w, idx) => (
                                                            <tr key={idx}>
                                                                <td className="p-3 font-medium text-slate-900 dark:text-white">{w.name}</td>
                                                                <td className="p-3 text-right text-slate-600 dark:text-slate-400">{w.hours.toLocaleString('cs-CZ')} h</td>
                                                                <td className="p-3 text-right text-slate-600 dark:text-slate-400">{currency(w.cost)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={3} className="p-4 text-center text-slate-400 italic">Žádné vykázané hodiny</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                {action.workers && action.workers.length > 0 && (
                                                    <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                                                        <tr>
                                                            <td className="p-3">Celkem</td>
                                                            <td className="p-3 text-right">{action.workers.reduce((acc, w) => acc + w.hours, 0).toLocaleString('cs-CZ')} h</td>
                                                            <td className="p-3 text-right">{currency(action.workers.reduce((acc, w) => acc + w.cost, 0))}</td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    </div>

                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ActionDetailModal;
