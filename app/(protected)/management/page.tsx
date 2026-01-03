'use client';

import { ManagementDashboard } from '@/components/accounting/analytics/ManagementDashboard';
import { Suspense, useEffect } from 'react';
import { CompanyConfig } from '@/lib/companyConfig';
import { useRouter } from 'next/navigation';

export default function ManagementPage() {
    const router = useRouter();

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

            <Suspense fallback={<div className="p-6 text-slate-500">Načítám přehled...</div>}>
                <ManagementDashboard />
            </Suspense>
        </div>
    );
}
