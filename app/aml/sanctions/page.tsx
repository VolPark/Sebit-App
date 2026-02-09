'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';

type SyncResult = {
    success: boolean;
    message: string;
    details?: {
        success: string[];
        failed: { id: string; error: string }[];
        skipped: string[];
        totalRecords: number;
    };
};

type ConfigStatus = {
    activeLists: string[];
    totalActive: number;
};

export default function SanctionsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingList, setLoadingList] = useState<string | null>(null);
    const [stats, setStats] = useState({ total: 0, lastUpdate: '-' });
    const [config, setConfig] = useState<ConfigStatus | null>(null);

    useEffect(() => {
        fetchLogs();
        fetchStats();
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/aml/sanctions/sync');
            if (res.ok) {
                const data = await res.json();
                setConfig(data);
            }
        } catch (e) {
            console.error('Failed to fetch config', e);
        }
    };

    const fetchLogs = async () => {
        const { data } = await supabase
            .from('aml_sanction_update_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(15);
        if (data) setLogs(data);
    };

    const fetchStats = async () => {
        const { count } = await supabase.from('aml_sanction_list_items').select('*', { count: 'exact', head: true });
        const { data: lastLog } = await supabase.from('aml_sanction_update_logs').select('created_at').eq('status', 'success').order('created_at', { ascending: false }).limit(1).single();

        setStats({
            total: count || 0,
            lastUpdate: lastLog ? new Date(lastLog.created_at).toLocaleString() : 'Nikdy'
        });
    };

    const handleUpdateAll = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/aml/sanctions/sync', { method: 'POST' });
            const data: SyncResult = await res.json();

            if (res.ok && data.success) {
                toast.success(data.message);
            } else if (res.ok) {
                // Partial success
                toast.warning(`${data.message} (${data.details?.failed.length || 0} selhalo)`);
            } else {
                toast.error(data.message || 'Chyba při aktualizaci');
            }
            fetchLogs();
            fetchStats();
        } catch (e: unknown) {
            toast.error('Chyba při aktualizaci: ' + getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSingle = async (listId: string) => {
        setLoadingList(listId);
        try {
            const res = await fetch('/api/aml/sanctions/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listId })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
            } else {
                toast.error(data.error || 'Chyba při aktualizaci');
            }
            fetchLogs();
            fetchStats();
        } catch (e: unknown) {
            toast.error('Chyba při aktualizaci: ' + getErrorMessage(e));
        } finally {
            setLoadingList(null);
        }
    };

    const listLabels: Record<string, { name: string; flag: string }> = {
        EU: { name: 'EU Sanctions', flag: '🇪🇺' },
        OFAC: { name: 'US OFAC SDN', flag: '🇺🇸' },
        CZ: { name: 'CZ FAU', flag: '🇨🇿' },
        AMLA: { name: 'EU AMLA', flag: '🏛️' }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sankční seznamy</h2>
                <button
                    onClick={handleUpdateAll}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Aktualizuji vše...
                        </>
                    ) : (
                        'Aktualizovat vše'
                    )}
                </button>
            </div>

            {/* Active Lists */}
            {config && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Aktivní seznamy</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {config.activeLists.map((listId) => {
                            const info = listLabels[listId] || { name: listId, flag: '📋' };
                            const isUpdating = loadingList === listId;
                            return (
                                <div
                                    key={listId}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{info.flag}</span>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{info.name}</p>
                                            <p className="text-xs text-gray-500">{listId}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUpdateSingle(listId)}
                                        disabled={isUpdating || loading}
                                        className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
                                    >
                                        {isUpdating ? '...' : 'Sync'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    {config.activeLists.length === 0 && (
                        <p className="text-gray-500 text-center py-4">Žádné aktivní seznamy. Zkontrolujte AML_ACTIVE_LISTS v .env.local</p>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                    <p className="text-sm font-semibold text-gray-500 uppercase">Celkem záznamů</p>
                    <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats.total.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                    <p className="text-sm font-semibold text-gray-500 uppercase">Poslední úspěšná aktualizace</p>
                    <p className="text-3xl font-bold mt-2 text-blue-600">{stats.lastUpdate}</p>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Historie aktualizací</h3>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                        <tr>
                            <th className="p-4">Datum</th>
                            <th className="p-4">Seznam</th>
                            <th className="p-4">Stav</th>
                            <th className="p-4">Záznamů</th>
                            <th className="p-4">Délka</th>
                            <th className="p-4">Zpráva</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">Zatím žádné záznamy.</td>
                            </tr>
                        ) : (
                            logs.map((log) => {
                                const info = listLabels[log.list_name] || { flag: '📋' };
                                return (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4 text-gray-900 dark:text-white">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-medium">
                                            <span className="mr-2">{info.flag}</span>
                                            {log.list_name}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                log.status === 'running' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-700 dark:text-gray-300">{log.records_count?.toLocaleString() || '-'}</td>
                                        <td className="p-4 text-gray-500">{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(2)}s` : '-'}</td>
                                        <td className="p-4 text-gray-500 truncate max-w-xs" title={log.message}>{log.message}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
