'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                <div className="flex justify-center mb-4">
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                </div>

                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Chyba aplikace
                </h2>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Došlo k neočekávané chybě. Zkuste obnovit stránku.
                </p>

                {error.digest && (
                    <p className="text-xs text-gray-400 mb-4 font-mono">
                        Kód: {error.digest}
                    </p>
                )}

                <button
                    onClick={reset}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                    <RefreshCw className="h-4 w-4" />
                    Obnovit stránku
                </button>
            </div>
        </div>
    );
}
