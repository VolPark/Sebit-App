import { WorkerStats } from '@/lib/dashboard';
import { formatRate } from '@/lib/formatting';
import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface Props {
    worker: WorkerStats | null;
    onClose: () => void;
}

const WorkerDetailModal = ({ worker, onClose }: Props) => {
    if (!worker) return null;

    const currency = (val: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val);

    return (
        <Transition appear show={!!worker} as={Fragment}>
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
                                            {worker.name}
                                        </h3>
                                    </div>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* KPI Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Odpracováno</div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">{worker.totalHours.toLocaleString('cs-CZ')} h</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Vyplaceno (Mzdy)</div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">{currency(worker.totalWages)}</div>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl">
                                        <div className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-bold">Reálná Sazba</div>
                                        <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">{formatRate(worker.realHourlyRate)}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">Alokovaná Sazba</div>
                                        <div className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-1">{formatRate(worker.avgHourlyRate)}</div>
                                    </div>
                                </div>

                                {/* Projects List */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Historie projektů ({worker.projects?.length || 0})</h4>
                                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0">
                                                <tr>
                                                    <th className="p-3 text-left font-medium">Datum</th>
                                                    <th className="p-3 text-left font-medium">Akce</th>
                                                    <th className="p-3 text-left font-medium">Klient</th>
                                                    <th className="p-3 text-right font-medium">Hodiny</th>
                                                    <th className="p-3 text-right font-medium">Náklad (Alok.)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {worker.projects && worker.projects.length > 0 ? (
                                                    worker.projects.map((p, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                            <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(p.date).toLocaleDateString('cs-CZ')}</td>
                                                            <td className="p-3 font-medium text-slate-900 dark:text-white">{p.name}</td>
                                                            <td className="p-3 text-slate-600 dark:text-slate-400">{p.clientName}</td>
                                                            <td className="p-3 text-right text-slate-700 dark:text-slate-300">{p.hours.toLocaleString('cs-CZ')} h</td>
                                                            <td className="p-3 text-right text-slate-500 dark:text-slate-400">{currency(p.cost)}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">Žádné projekty v tomto období</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
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

export default WorkerDetailModal;
