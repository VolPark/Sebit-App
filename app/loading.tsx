'use client';

import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex-1 flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Načítání aplikace...</p>
            </div>
        </div>
    );
}
