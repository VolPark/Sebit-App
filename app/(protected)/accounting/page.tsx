'use client';

import { useEffect, useState } from 'react';
import { CompanyConfig } from '@/lib/companyConfig';
import { useRouter } from 'next/navigation';
import { RefreshCw, Settings } from 'lucide-react';
import { DocumentsTable } from '@/components/accounting/DocumentsTable';
import { toast } from 'sonner';
import { ProviderSettingsModal } from '@/components/accounting/ProviderSettingsModal';
import { AccountingStats } from '@/components/accounting/AccountingStats';
import { BankAccountsTile } from '@/components/accounting/reports/BankAccountsTile';

export default function AccountingPage() {
    const router = useRouter();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (!CompanyConfig.features.enableAccounting) {
            router.push('/');
        }
    }, [router]);

    if (!CompanyConfig.features.enableAccounting) return null;

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch('/api/accounting/sync', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Sync failed');
            toast.success('Synchronizace dokončena');
            window.location.reload();
        } catch (e: any) {
            toast.error('Chyba synchronizace: ' + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Účetnictví</h1>
                    <p className="text-muted-foreground text-slate-500">Přehled faktur a nákladů z UOL</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Nastavení
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center px-4 py-2 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Synchronizuji...' : 'Synchronizovat'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`${activeTab === 'overview' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Přehled
                        </button>
                        <button
                            onClick={() => setActiveTab('sales')}
                            className={`${activeTab === 'sales' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Vydané faktury
                        </button>
                        <button
                            onClick={() => setActiveTab('purchase')}
                            className={`${activeTab === 'purchase' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Přijaté faktury
                        </button>
                        <button
                            onClick={() => router.push('/accounting/reports')}
                            className="border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2"
                        >
                            Reporty <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">NOVÉ</span>
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-4">
                    {activeTab === 'overview' && (
                        <div className="flex flex-col gap-6">
                            {/* Quick Overview (Stats) */}
                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 shadow-sm">
                                <div className="flex flex-col space-y-1.5 p-6">
                                    <h3 className="font-semibold leading-none tracking-tight">Rychlý přehled</h3>
                                </div>
                                <div className="p-6 pt-0">
                                    <AccountingStats />
                                </div>
                            </div>

                            {/* Bank Accounts (Full Width) */}
                            <div className="h-full min-h-[16rem]">
                                <BankAccountsTile />
                            </div>
                        </div>
                    )}

                    {activeTab === 'sales' && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 shadow-sm">
                            <div className="flex flex-col space-y-1.5 p-6">
                                <h3 className="font-semibold leading-none tracking-tight">Vydané faktury</h3>
                            </div>
                            <div className="p-6 pt-0">
                                <DocumentsTable type="sales_invoice" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'purchase' && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 shadow-sm">
                            <div className="flex flex-col space-y-1.5 p-6">
                                <h3 className="font-semibold leading-none tracking-tight">Přijaté faktury</h3>
                            </div>
                            <div className="p-6 pt-0">
                                <DocumentsTable type="purchase_invoice" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ProviderSettingsModal
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
            />
        </div >
    );
}
