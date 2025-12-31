'use client';

import { usePDF } from '@react-pdf/renderer';
import TimesheetPdf from './TimesheetPdf';
import { useEffect, useState } from 'react';

interface TimesheetPdfDownloadButtonProps {
    reportType: 'worker' | 'client';
    period: string;
    entityName: string;
    items: any[];
    totalHours: number;
    fileName: string;
}

export default function TimesheetPdfDownloadButton({
    reportType,
    period,
    entityName,
    items,
    totalHours,
    fileName
}: TimesheetPdfDownloadButtonProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const [instance, updateInstance] = usePDF({
        document: (
            <TimesheetPdf
                reportType={reportType}
                period={period}
                entityName={entityName}
                items={items}
                totalHours={totalHours}
            />
        )
    });

    if (!isClient) return null;

    if (instance.loading) {
        return (
            <button disabled className="inline-flex items-center px-6 py-3 bg-gray-300 text-gray-500 font-bold rounded-lg cursor-not-allowed">
                Generuji PDF...
            </button>
        );
    }

    if (instance.error) {
        return (
            <button disabled className="inline-flex items-center px-6 py-3 bg-red-100 text-red-500 font-bold rounded-lg cursor-not-allowed">
                Chyba generování PDF
            </button>
        );
    }

    return (
        <a
            href={instance.url || '#'}
            download={fileName}
            className="inline-flex items-center px-6 py-3 bg-brand-primary text-brand-primary-foreground font-bold rounded-lg hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20"
        >
            Stáhnout PDF
        </a>
    );
}
