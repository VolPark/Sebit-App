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
        if (reportType === 'client') {
            // If we just switched to client, the previous employee ID is definitely invalid.
            // However, this effect runs on selectedMonth change too.
            // We'll let the user re-select for clarity, or we could check if current ID is in new list.
            // For simplicity in this step:
        }
    }, [reportType, selectedMonth, supabase]);

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
                            onClick={() => setReportType('worker')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${reportType === 'worker' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Pracovník
                        </button>
                        <button
                            onClick={() => setReportType('client')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${reportType === 'client' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700'
                                }`}
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
                        value={selectedEntityId}
                        onChange={(e) => setSelectedEntityId(e.target.value)}
                        className="block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
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
                    <span className="text-sm font-medium bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full">
                        Celkem: {totalHours.toLocaleString('cs-CZ')} hod
                    </span>
                </div>

                {workLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 uppercase font-medium text-xs">
                                <tr>
                                    <th className="px-6 py-4">Datum</th>
                                    {reportType === 'worker' && <th className="px-6 py-4">Klient</th>}
                                    {reportType === 'client' && <th className="px-6 py-4">Pracovník</th>}
                                    <th className="px-6 py-4">Projekt</th>
                                    <th className="px-6 py-4">Popis</th>
                                    <th className="px-6 py-4 text-right">Hodiny</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {workLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4">{new Date(log.date).toLocaleDateString('cs-CZ')}</td>
                                        {reportType === 'worker' && <td className="px-6 py-4">{log.clientName || '-'}</td>}
                                        {reportType === 'client' && <td className="px-6 py-4">{log.workerName || '-'}</td>}
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">{log.project}</td>
                                        <td className="px-6 py-4 max-w-md truncate" title={log.description}>{log.description}</td>
                                        <td className="px-6 py-4 text-right font-mono text-brand-primary font-bold">{log.hours}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
