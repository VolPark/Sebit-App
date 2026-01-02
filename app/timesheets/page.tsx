'use client';

import { useState, useEffect } from 'react';
import { CompanyConfig } from '@/lib/companyConfig';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import dynamic from 'next/dynamic';

const TimesheetPdfDownloadButton = dynamic(() => import('@/components/timesheets/TimesheetPdfDownloadButton'), {
    ssr: false,
    loading: () => <button disabled className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-400 font-bold rounded-lg cursor-not-allowed">Načítání...</button>
});

// Types
type ReportType = 'worker' | 'client';

interface Entity {
    id: number;
    name: string;
}

interface WorkLog {
    id: number;
    date: string;
    project: string;
    description: string;
    hours: number;
    clientName?: string;
    workerName?: string;
    workerRole?: string;
}

export default function TimesheetsPage() {
    const router = useRouter();
    const supabase = createClient();

    // State
    const [isClient, setIsClient] = useState(false);
    const [reportType, setReportType] = useState<ReportType>('worker');
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedEntityId, setSelectedEntityId] = useState<string>('');
    const [entities, setEntities] = useState<Entity[]>([]);
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Reporter Logic State
    const [isReporter, setIsReporter] = useState(false);
    const [reporterWorkerId, setReporterWorkerId] = useState<number | null>(null);

    useEffect(() => {
        const initReporter = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (profile?.role === 'reporter') {
                setIsReporter(true);

                const { data: worker } = await supabase.from('pracovnici').select('id, jmeno').eq('user_id', user.id).single();
                if (worker) {
                    setReporterWorkerId(worker.id);
                    setSelectedEntityId(worker.id.toString());
                    setReportType('worker');

                    // Find last active month
                    const { data: lastLog } = await supabase
                        .from('prace')
                        .select('datum')
                        .eq('pracovnik_id', worker.id)
                        .order('datum', { ascending: false })
                        .limit(1)
                        .single();

                    if (lastLog) {
                        const lastDate = new Date(lastLog.datum);
                        const lastMonthStr = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;
                        setSelectedMonth(lastMonthStr);
                    }
                }
            }
        };
        initReporter();
    }, []);

    // Feature Flag Check
    useEffect(() => {
        if (!CompanyConfig.features.enableFinanceTimesheets) {
            router.push('/dashboard');
        }
        setIsClient(true);
    }, [router]);

    // Fetch Entities (Workers or Clients) - Only those active in the selected month
    useEffect(() => {
        const fetchEntities = async () => {
            const [year, month] = selectedMonth.split('-');
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const startDate = `${year}-${month}-01`;
            const endDate = `${year}-${month}-${lastDay}`;

            let data: any[] | null = null;

            // If Reporter, just show themselves
            if (isReporter && reporterWorkerId) {
                // We need the name - could get it from state if we stored it, or fetch.
                // Let's fetch to be safe or optimize later.
                const { data: worker } = await supabase.from('pracovnici').select('id, jmeno').eq('id', reporterWorkerId).single();
                if (worker) {
                    setEntities([{ id: worker.id, name: worker.jmeno }]);
                }
                return;
            }

            if (reportType === 'worker') {
                // Fetch workers who have work logs in this period
                const response = await supabase
                    .from('prace')
                    .select('pracovnici!inner(id, jmeno)')
                    .gte('datum', startDate)
                    .lte('datum', endDate);
                data = response.data;
            } else {
                // Fetch clients who have work logs in this period
                // We use the direct relation prace -> klienti if available and reliable,
                // or via akce -> klienti if better. Schema context says prace has klient_id directly.
                const response = await supabase
                    .from('prace')
                    .select('klienti!inner(id, nazev)')
                    .gte('datum', startDate)
                    .lte('datum', endDate);
                data = response.data;
            }

            if (data) {
                // Extract unique entities
                const uniqueMap = new Map();
                data.forEach((item: any) => {
                    const entity = reportType === 'worker' ? item.pracovnici : item.klienti;
                    if (entity && !uniqueMap.has(entity.id)) {
                        uniqueMap.set(entity.id, {
                            id: entity.id,
                            name: reportType === 'worker' ? entity.jmeno : entity.nazev
                        });
                    }
                });

                const sorted = Array.from(uniqueMap.values()).sort((a: any, b: any) =>
                    a.name.localeCompare(b.name)
                );

                setEntities(sorted);
            } else {
                setEntities([]);
            }
        };

        fetchEntities();
        // Reset selection when type or month changes, unless the ID still exists in the new list (handled by UI state naturally, but safer to clear if meaningful)
        // Actually, if we switch month, we might want to keep the same entity if they worked in that month too.
        // But for now, let's keep it simple or the user might get confused if ID persists but is not in list.
        // The controlled select will show empty if ID is not in options usually.
        // But let's clear it to be safe if switching types.
        if (reportType === 'client' && !isReporter) {
            // If we just switched to client, the previous employee ID is definitely invalid.
            // However, this effect runs on selectedMonth change too.
            // We'll let the user re-select for clarity, or we could check if current ID is in new list.
            // For simplicity in this step:
        }
    }, [reportType, selectedMonth, supabase, isReporter, reporterWorkerId]); // added deps

    // Reset selection effect
    useEffect(() => {
        setSelectedEntityId('');
    }, [reportType]);

    // Fetch Work Logs
    useEffect(() => {
        if (!selectedEntityId || !selectedMonth) return;

        const fetchLogs = async () => {
            setLoading(true);
            const [year, month] = selectedMonth.split('-');
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const startDate = `${year}-${month}-01`;
            const endDate = `${year}-${month}-${lastDay}`;

            let query: any = supabase
                .from('prace')
                .select(`
                    id,
                    datum,
                    popis,
                    pocet_hodin,
                    akce (
                        nazev
                    )
                `)
                .gte('datum', startDate)
                .lte('datum', endDate)
                .order('datum', { ascending: true });

            if (reportType === 'worker') {
                query = supabase
                    .from('prace')
                    .select(`
                        id,
                        datum,
                        popis,
                        pocet_hodin,
                        akce!inner (
                            nazev,
                            klient_id,
                            klienti (
                                nazev
                            )
                        )
                    `)
                    .eq('pracovnik_id', selectedEntityId)
                    .gte('datum', startDate)
                    .lte('datum', endDate)
                    .order('datum', { ascending: true });
            } else {
                // For client, we need to filter by akce.klient_id provided via inner join
                query = supabase
                    .from('prace')
                    .select(`
                        id,
                        datum,
                        popis,
                        pocet_hodin,
                        akce!inner (
                            nazev,
                            klient_id
                        ),
                        pracovnici (
                            jmeno,
                            role
                        )
                    `)
                    .eq('akce.klient_id', selectedEntityId)
                    .gte('datum', startDate)
                    .lte('datum', endDate)
                    .order('datum', { ascending: true });
            }

            const { data, error } = await query;

            if (data) {
                setWorkLogs(data.map((item: any) => ({
                    id: item.id,
                    date: item.datum,
                    project: item.akce?.nazev || 'Bez projektu',
                    description: item.popis,
                    hours: item.pocet_hodin,
                    clientName: item.akce?.klienti?.nazev,
                    workerName: item.pracovnici?.jmeno,
                    workerRole: item.pracovnici?.role
                })));
            } else if (error) {
                console.error("Error fetching logs:", JSON.stringify(error, null, 2));
            }
            setLoading(false);
        };

        fetchLogs();
    }, [selectedEntityId, selectedMonth, reportType, supabase]);

    const totalHours = workLogs.reduce((sum, item) => sum + item.hours, 0);
    const selectedEntityName = entities.find(e => e.id.toString() === selectedEntityId)?.name || '';

    // Format period string for PDF (e.g., "Leden 2025")
    const dateObj = new Date(selectedMonth + '-01');
    const periodString = dateObj.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });

    // Dynamic Branding Check
    const isSebit = CompanyConfig.name.toUpperCase().includes('SEBIT');
    const projectHeaderClass = isSebit
        ? "flex justify-between items-center mb-3 p-2 bg-[#002B5C] rounded-lg shadow-sm" // SEBIT Navy
        : "flex justify-between items-center mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm"; // Horyna Gray

    const projectTitleClass = isSebit
        ? "font-bold text-xs uppercase tracking-wider text-[#C6FF00]" // SEBIT Lime
        : "font-bold text-xs uppercase tracking-wider text-brand-primary"; // Horyna Red

    const projectTotalClass = isSebit
        ? "text-xs font-bold text-[#C6FF00]/90" // SEBIT Lime
        : "text-xs font-bold text-brand-primary/90"; // Horyna Red

    const summaryPillClass = isSebit
        ? "text-sm font-medium bg-[#002B5C] text-[#C6FF00] px-3 py-1 rounded-full shadow-sm"
        : "text-sm font-medium bg-gray-100 dark:bg-gray-800 text-brand-primary px-3 py-1 rounded-full shadow-sm";

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
                    {isClient && selectedEntityId && workLogs.length > 0 ? (
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
                                    // For client report, group by Worker (maybe include Role?)
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
