import React from 'react';

interface KPICardProps {
    title: string;
    value: string;
    helpText?: string;
    percentage?: string;
    percentageColor?: string;
}

/**
 * KPICard - Reusable card component for displaying key performance indicators
 * Used in dashboard views to show metrics like Revenue, Costs, Profit, etc.
 */
export function KPICard({ title, value, helpText, percentage, percentageColor }: KPICardProps) {
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
            <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">{title}</p>
                {percentage && <span className={`text-lg font-bold ${percentageColor}`}>{percentage}</span>}
            </div>
            <p className="text-2xl md:text-3xl font-bold mt-2 text-[#333333] dark:text-white">{value}</p>
            {helpText && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{helpText}</p>}
        </div>
    );
}
