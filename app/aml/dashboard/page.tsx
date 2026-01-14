'use client';

import { useState } from 'react';

// Mock Data
const stats = {
    checkedEntities: 1240,
    blockedEntities: 3,
    pendingReviews: 5,
    lastCheck: '10 min ago'
};

const checks = [
    { id: 1, entity: 'ABC Construction', status: 'CLEARED', date: '2024-01-13 10:30', risk: 'LOW' },
    { id: 2, entity: 'Volodymyr Trading', status: 'HIT_FOUND', date: '2024-01-13 09:15', risk: 'HIGH' },
    { id: 3, entity: 'Local Bakery s.r.o.', status: 'CLEARED', date: '2024-01-12 16:45', risk: 'LOW' },
];

export default function AmlDashboardPage() {
    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                    <p className="text-sm font-semibold text-gray-500 uppercase">Monitored Entities</p>
                    <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{stats.checkedEntities}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                    <p className="text-sm font-semibold text-gray-500 uppercase">Blocked / High Risk</p>
                    <p className="text-3xl font-bold mt-2 text-red-600">{stats.blockedEntities}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                    <p className="text-sm font-semibold text-gray-500 uppercase">Pending Review</p>
                    <p className="text-3xl font-bold mt-2 text-orange-500">{stats.pendingReviews}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                    <p className="text-sm font-semibold text-gray-500 uppercase">System Status</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Online</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Last check: {stats.lastCheck}</p>
                </div>
            </div>

            {/* Recent Checks Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Checks</h3>
                    <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">View All</button>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                        <tr>
                            <th className="p-4">Entity</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Risk Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {checks.map((check) => (
                            <tr key={check.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                <td className="p-4 font-medium text-gray-900 dark:text-white">{check.entity}</td>
                                <td className="p-4 text-gray-500 dark:text-gray-400">{check.date}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${check.status === 'CLEARED'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {check.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <span className={`font-bold ${check.risk === 'LOW' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {check.risk}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
