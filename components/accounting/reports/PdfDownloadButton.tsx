'use client';

import React, { useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';

interface PdfDownloadButtonProps {
    document: React.ReactElement;
    fileName: string;
    label?: string;
}

export function PdfDownloadButton({ document, fileName, label = "Tisk do PDF" }: PdfDownloadButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        if (loading) return;
        setLoading(true);
        try {
            // Dynamically import the renderer to ensure no SSR/hydration issues
            const { pdf } = await import('@react-pdf/renderer');
            const blob = await pdf(document).toBlob();
            const url = URL.createObjectURL(blob);

            const link = window.document.createElement('a');
            link.href = url;
            link.download = fileName;
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Chyba při generování PDF. Zkuste to prosím znovu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Printer className="w-4 h-4" />
            )}
            <span>{loading ? 'Generování...' : label}</span>
        </button>
    );
}
