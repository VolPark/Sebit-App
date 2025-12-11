import Skeleton from './Skeleton';

interface DashboardSkeletonProps {
    view: 'firma' | 'workers' | 'clients';
}

export default function DashboardSkeleton({ view }: DashboardSkeletonProps) {
    if (view === 'firma') {
        return (
            <div className="space-y-6">
                {/* Chart Area */}
                <div className="w-full h-[400px] bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/80">
                    <div className="flex justify-between mb-8">
                        <Skeleton className="h-6 w-32" />
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-20" />
                        </div>
                    </div>
                    <div className="flex items-end justify-between h-64 gap-2">
                        {[...Array(12)].map((_, i) => (
                            <Skeleton key={i} className="w-full rounded-t-md" style={{ height: `${30 + (i * 7) % 50}%` }} />
                        ))}
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 h-32 flex flex-col justify-between">
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                            <Skeleton className="h-8 w-36" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                    ))}
                </div>

                {/* Bottom Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 h-64">
                            <Skeleton className="h-4 w-32 mb-6" />
                            <div className="space-y-4">
                                {[...Array(5)].map((_, j) => (
                                    <div key={j} className="flex justify-between">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-4 w-20" />
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
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex gap-4">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                ))}
            </div>
            <div className="p-0">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="p-4 border-b border-slate-50 flex gap-4">
                        <Skeleton className="h-5 w-1/4" />
                        <Skeleton className="h-5 w-1/4" />
                        <Skeleton className="h-5 w-1/4" />
                        <Skeleton className="h-5 w-1/4" />
                    </div>
                ))}
            </div>
        </div>
    );
}
