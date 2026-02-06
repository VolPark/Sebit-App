'use client';

import { useEffect, useState } from 'react';
import { CompanyConfig } from '@/lib/companyConfig';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Settings } from 'lucide-react';
import { DocumentsTable } from '@/components/accounting/DocumentsTable';
import { toast } from 'sonner';
import { ProviderSettingsModal } from '@/components/accounting/ProviderSettingsModal';
import { AccountingStats } from '@/components/accounting/AccountingStats';
import { BankAccountsTile } from '@/components/accounting/reports/BankAccountsTile';
import { GeneralLedgerTile } from '@/components/accounting/reports/GeneralLedgerTile';
import { JournalTile } from '@/components/accounting/reports/JournalTile';
import { BalanceSheetTile } from '@/components/accounting/reports/BalanceSheetTile';
import { ProfitLossTile } from '@/components/accounting/reports/ProfitLossTile';
import { ReceivablesTile } from '@/components/accounting/reports/ReceivablesTile';
import { PayablesTile } from '@/components/accounting/reports/PayablesTile';
import { ValueAddedTile } from '@/components/accounting/reports/ValueAddedTile';
import { BurnRateTile } from '@/components/accounting/analytics/BurnRateTile';
import { VatControlTile } from '@/components/accounting/analytics/VatControlTile';
import { VatEstimationTile } from '@/components/accounting/reports/VatEstimationTile';
import { TaxEstimationTab } from '@/components/accounting/reports/TaxEstimationTab';
import { Suspense } from 'react';



function AccountingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // Initialize tab from URL or default to overview
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Účetnictví</h1>
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
                    <nav className="-mb-px flex space-x-4 md:space-x-8 overflow-x-auto no-scrollbar" aria-label="Tabs">
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
                            onClick={() => setActiveTab('reports')}
                            className={`${activeTab === 'reports' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Reporty
                        </button>
                        <button
                            onClick={() => setActiveTab('tax')}
                            className={`${activeTab === 'tax' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Daňové odhady
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

                            {/* Analytics Grid (4 cols) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                {/* Burn Rate */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-auto min-h-[12rem]">
                                    <BurnRateTile />
                                </div>
                                {/* VAT Estimation (New) */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-auto min-h-[12rem]">
                                    <VatEstimationTile />
                                </div>
                                {/* Receivables */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-auto min-h-[12rem]">
                                    <ReceivablesTile />
                                </div>
                                {/* Payables */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-auto min-h-[12rem]">
                                    <PayablesTile />
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

                    {activeTab === 'reports' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                {/* Balance Sheet Tile */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-64 md:h-auto min-h-[16rem]">
                                    <BalanceSheetTile />
                                </div>

                                {/* Profit & Loss Tile (Výsledovka) */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-64 md:h-auto min-h-[16rem]">
                                    <ProfitLossTile />
                                </div>

                                {/* General Ledger Tile */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-64 md:h-auto min-h-[16rem]">
                                    <GeneralLedgerTile />
                                </div>

                                {/* Journal Tile */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-64 md:h-auto min-h-[16rem]">
                                    <JournalTile />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tax' && (
                        <TaxEstimationTab />
                    )}
                </div>
            </div>

            <ProviderSettingsModal
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
            />
        </div>
    );
}

export default function AccountingPage() {
    return (
        <Suspense fallback={<div className="p-6 text-slate-500">Načítám...</div>}>
            <AccountingContent />
        </Suspense>
    );
}
