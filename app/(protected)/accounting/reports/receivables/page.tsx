'use client';

import { Suspense } from 'react';
import { ReceivablesReport } from '@/components/accounting/reports/ReceivablesReport';

export default function ReceivablesReportPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <Suspense fallback={<div>Načítám report...</div>}>
                <ReceivablesReport />
            </Suspense>
        </div>
    );
}
