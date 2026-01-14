'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function SanctionsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, lastUpdate: '-' });

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, []);

    const fetchLogs = async () => {
        const { data } = await supabase
            .from('aml_sanction_update_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
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

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/aml/sanctions/update-eu', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                fetchLogs();
                fetchStats();
            } else {
                toast.error(data.error);
            }
        } catch (e: any) {
            toast.error('Chyba při aktualizaci: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sankční seznamy (EU)</h2>
                <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Aktualizuji...
                        </>
                    ) : (
                        'Aktualizovat nyní'
                    )}
                </button>
            </div>

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
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                    <td className="p-4 text-gray-900 dark:text-white">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4 font-medium">{log.list_name}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                log.status === 'running' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-300">{log.records_count}</td>
                                    <td className="p-4 text-gray-500">{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(2)}s` : '-'}</td>
                                    <td className="p-4 text-gray-500 truncate max-w-xs" title={log.message}>{log.message}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
