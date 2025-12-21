import Skeleton from './Skeleton';

interface DashboardSkeletonProps {
    view: 'firma' | 'workers' | 'clients' | 'experimental' | 'ai';
}

export default function DashboardSkeleton({ view }: DashboardSkeletonProps) {
    if (view === 'firma') {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Chart Area */}
                <div className="w-full h-[400px] bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-800 flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <Skeleton className="h-7 w-48 mb-2" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <Skeleton className="h-8 w-20 rounded-md" />
                            <Skeleton className="h-8 w-20 rounded-md" />
                        </div>
                    </div>
                    <div className="flex-1 flex items-end justify-between gap-4 px-2">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="w-full flex flex-col gap-2 items-center">
                                <Skeleton className="w-full rounded-t-md" style={{ height: `${20 + (i * 9) % 70}%`, opacity: 0.7 }} />
                                <Skeleton className="h-3 w-8" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-800 flex flex-col justify-between h-36">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Skeleton className="h-4 w-24 mb-2" />
                                    <Skeleton className="h-8 w-32" />
                                </div>
                                <Skeleton className="h-10 w-10 rounded-full opacity-80" />
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <Skeleton className="h-4 w-12 rounded-full" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-800 h-80 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-8 w-24 rounded-lg" />
                            </div>
                            <div className="space-y-4 flex-1 overflow-hidden">
                                {[...Array(5)].map((_, j) => (
                                    <div key={j} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-8 w-8 rounded-full" />
                                            <div>
                                                <Skeleton className="h-4 w-32 mb-1" />
                                                <Skeleton className="h-3 w-20 opacity-60" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-5 w-16" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Table Skeleton for Workers/Clients
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-800 overflow-hidden animate-in fade-in duration-500">
            {/* Header Toolbar Simulation */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-24 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>

            {/* Table Header */}
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 flex gap-4 border-b border-gray-100 dark:border-slate-800">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="p-4 flex gap-4 items-center">
                        <div className="w-1/4 flex gap-3 items-center">
                            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                ))}
            </div>
        </div>
    );
}
