'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    useEffect(() => {
        // Log error to console for debugging
        console.error('Page error:', error);
    }, [error]);

    return (
        <div className="flex-1 flex items-center justify-center min-h-[400px] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                <div className="flex justify-center mb-4">
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                </div>

                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Něco se pokazilo
                </h2>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Při načítání stránky došlo k chybě. Zkuste to prosím znovu.
                </p>

                {error.digest && (
                    <p className="text-xs text-gray-400 mb-4 font-mono">
                        Kód chyby: {error.digest}
                    </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Zkusit znovu
                    </button>

                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                    >
                        <Home className="h-4 w-4" />
                        Na dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
