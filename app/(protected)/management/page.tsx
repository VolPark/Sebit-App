'use client';

import { ManagementDashboard } from '@/components/accounting/analytics/ManagementDashboard';
import { ValueAddedTab } from '@/components/accounting/reports/ValueAddedTab';
import { Suspense, useEffect, useState } from 'react';
import { CompanyConfig } from '@/lib/companyConfig';
import { useRouter, useSearchParams } from 'next/navigation';

function ManagementContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
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

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Manažerský přehled</h1>
                <p className="text-muted-foreground text-slate-500">Strategické ukazatele a finanční analýza</p>
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
                            onClick={() => setActiveTab('value-added')}
                            className={`${activeTab === 'value-added' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Přidaná hodnota
                        </button>
                    </nav>
                </div>

                <div className="mt-4">
                    {activeTab === 'overview' && (
                        <ManagementDashboard />
                    )}

                    {activeTab === 'value-added' && (
                        <ValueAddedTab />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ManagementPage() {
    return (
        <Suspense fallback={<div className="p-6 text-slate-500">Načítám přehled...</div>}>
            <ManagementContent />
        </Suspense>
    );
}
