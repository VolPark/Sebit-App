'use client';
import { useEffect, useState } from 'react';
import { CompanyConfig } from '@/lib/companyConfig';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useTimesheetData } from '@/hooks/useTimesheetData';
import { WorkLog } from '@/lib/types/timesheet-types';

const TimesheetPdfDownloadButton = dynamic(() => import('@/components/timesheets/TimesheetPdfDownloadButton'), {
    ssr: false,
    loading: () => <button disabled className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-400 font-bold rounded-lg cursor-not-allowed">Načítání...</button>
});

export default function TimesheetsPage() {
    const router = useRouter();
    const [isClient, setIsClient] = useState(false); // hydration safety

    const {
        reportType,
        setReportType,
        selectedMonth,
        setSelectedMonth,
        selectedEntityId,
        setSelectedEntityId,
        entities,
        workLogs,
        loading,
        isReporter
    } = useTimesheetData();

    // Feature Flag Check & Client Side
    useEffect(() => {
        if (!CompanyConfig.features.enableFinanceTimesheets) {
            router.push('/dashboard');
        }
        setIsClient(true);
    }, [router]);

    const totalHours = workLogs.reduce((sum, item) => sum + item.hours, 0);
    const selectedEntityName = entities.find(e => e.id.toString() === selectedEntityId)?.name || '';

    // Format period string for PDF (e.g., "Leden 2025")
    const dateObj = new Date(selectedMonth + '-01');
    const periodString = dateObj.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });

    // Dynamic Branding Check
    const isSebit = CompanyConfig.name.toUpperCase().includes('SEBIT');
    const projectHeaderClass = isSebit
        ? "flex justify-between items-center mb-3 p-2 bg-[#002B5C] rounded-lg shadow-sm"
        : "flex justify-between items-center mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm";

    const projectTitleClass = isSebit
        ? "font-bold text-xs uppercase tracking-wider text-[#C6FF00]"
        : "font-bold text-xs uppercase tracking-wider text-brand-primary";

    const projectTotalClass = isSebit
        ? "text-xs font-bold text-[#C6FF00]/90"
        : "text-xs font-bold text-brand-primary/90";

    const summaryPillClass = isSebit
        ? "text-sm font-medium bg-[#002B5C] text-[#C6FF00] px-3 py-1 rounded-full shadow-sm"
        : "text-sm font-medium bg-gray-100 dark:bg-gray-800 text-brand-primary px-3 py-1 rounded-full shadow-sm";

    if (!isClient) return null;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Timesheety</h1>

            {/* Controls */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap gap-6 items-end">

                {/* Report Type */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Typ reportu</label>
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                        <button
                            disabled={isReporter}
                            onClick={() => setReportType('worker')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${reportType === 'worker'
                                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                                : 'text-gray-500 hover:text-gray-700'
                                } ${isReporter ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Pracovník
                        </button>
                        <button
                            disabled={isReporter}
                            onClick={() => setReportType('client')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${reportType === 'client'
                                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                                : 'text-gray-500 hover:text-gray-700'
                                } ${isReporter ? 'opacity-50 cursor-not-allowed hidden' : ''}`}
                        >
                            Klient
                        </button>
                    </div>
                </div>

                {/* Date Picker */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Období</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                    />
                </div>

                {/* Entity Selector */}
                <div className="space-y-2 min-w-[200px]">
                    <label className="text-sm font-medium text-gray-500">
                        {reportType === 'worker' ? 'Vyberte pracovníka' : 'Vyberte klienta'}
                    </label>
                    <select
                        disabled={isReporter}
                        value={selectedEntityId}
                        onChange={(e) => setSelectedEntityId(e.target.value)}
                        className={`block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none ${isReporter ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-80' : ''
                            }`}
                    >
                        <option value="">-- Vybrat --</option>
                        {entities.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>
                </div>

                {/* Action Button */}
                <div className="ml-auto">
                    {selectedEntityId && workLogs.length > 0 ? (
                        <TimesheetPdfDownloadButton
                            reportType={reportType}
                            period={periodString}
                            entityName={selectedEntityName}
                            items={workLogs}
                            totalHours={totalHours}
                            fileName={`timesheet_${selectedEntityName.replace(/\s+/g, '_')}_${selectedMonth}.pdf`}
                        />
                    ) : (
                        <button disabled className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-400 font-bold rounded-lg cursor-not-allowed">
                            Stáhnout PDF
                        </button>
                    )}
                </div>
            </div>

            {/* Preview Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Náhled dat</h2>
                    <span className={summaryPillClass}>
                        Celkem: {totalHours.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })} hod / {(totalHours / 8).toFixed(2)} MD
                    </span>
                </div>

                {workLogs.length > 0 ? (
                    <div className="flex flex-col">
                        {(() => {
                            // 1. Group by Primary Key (Client for Worker report, Worker for Client report)
                            const primaryGroups: { [key: string]: WorkLog[] } = {};
                            workLogs.forEach(log => {
                                let key = '';
                                if (reportType === 'worker') {
                                    key = log.clientName || 'Ostatní';
                                } else {
                                    // For client report, group by Worker
                                    key = log.workerName || 'Neznámý';
                                }

                                if (!primaryGroups[key]) primaryGroups[key] = [];
                                primaryGroups[key].push(log);
                            });

                            const sortedPrimaryKeys = Object.keys(primaryGroups).sort((a, b) => a.localeCompare(b));

                            return sortedPrimaryKeys.map((primaryKey) => {
                                const primaryItems = primaryGroups[primaryKey];
                                const primaryTotal = primaryItems.reduce((sum, item) => sum + item.hours, 0);

                                // 2. Group by Project within Primary
                                const projectGroups: { [key: string]: WorkLog[] } = {};
                                primaryItems.forEach(log => {
                                    const pKey = log.project || 'Bez projektu';
                                    if (!projectGroups[pKey]) projectGroups[pKey] = [];
                                    projectGroups[pKey].push(log);
                                });

                                const sortedProjectKeys = Object.keys(projectGroups).sort((a, b) => a.localeCompare(b));

                                return (
                                    <div key={primaryKey} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                                        {/* Primary Header */}
                                        <div className="bg-gray-100 dark:bg-gray-900/50 px-6 py-3 flex justify-between items-center border-l-4 border-brand-primary">
                                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{primaryKey}</h3>
                                            <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                                                Celkem: {primaryTotal.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })} hod / {(primaryTotal / 8).toFixed(2)} MD
                                            </span>
                                        </div>

                                        {/* Projects Loop */}
                                        <div className="p-4 space-y-6">
                                            {sortedProjectKeys.map((projectKey) => {
                                                const projectItems = projectGroups[projectKey];
                                                const projectTotal = projectItems.reduce((sum, item) => sum + item.hours, 0);

                                                return (
                                                    <div key={projectKey} className="pl-2">
                                                        {/* Project Header */}
                                                        <div className={projectHeaderClass}>
                                                            <h4 className={projectTitleClass}>
                                                                {projectKey}
                                                            </h4>
                                                            <span className={projectTotalClass}>
                                                                {projectTotal.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })} hod / {(projectTotal / 8).toFixed(2)} MD
                                                            </span>
                                                        </div>

                                                        {/* Items Table */}
                                                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                                                            <thead className="text-xs text-gray-400 font-medium uppercase">
                                                                <tr>
                                                                    <th className="py-2 w-32">Datum</th>
                                                                    <th className="py-2">Popis</th>
                                                                    <th className="py-2 w-24 text-right">Hodiny</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                                {projectItems.map(log => (
                                                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                                        <td className="py-2">{new Date(log.date).toLocaleDateString('cs-CZ')}</td>
                                                                        <td className="py-2">{log.description}</td>
                                                                        <td className="py-2 text-right font-mono text-gray-900 dark:text-gray-200">{log.hours.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-500">
                        {loading ? 'Načítám data...' : 'Žádná data pro vybrané období.'}
                    </div>
                )}
            </div>
        </div>
    );
}
