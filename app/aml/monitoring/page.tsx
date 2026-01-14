'use client';

export default function AmlMonitoringPage() {
    return (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M8.159 13.395l3.541-3.542 3.322 3.322L19.5 7.5" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Transaction Monitoring</h3>
            <p className="text-gray-500 text-sm mt-1">This module involves rule-based scenarios and AI detectors (Planned for Q3 2026).</p>
        </div>
    );
}
