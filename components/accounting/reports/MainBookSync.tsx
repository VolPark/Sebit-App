'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function MainBookSync() {
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/accounting/sync', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Chyba synchronizace');

            toast.success(`Synchronizace dokončena. Staženo ${data.synced} záznamů.`);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors text-sm font-medium"
        >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronizuji deník...' : 'Aktualizovat data'}
        </button>
    );
}
