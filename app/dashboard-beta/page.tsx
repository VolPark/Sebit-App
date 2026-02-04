'use server'

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardBetaClient from '@/app/dashboard-beta/DashboardBetaClient';
import { getDashboardData, getDetailedStats, getExperimentalStats } from '@/lib/dashboard';

export default async function DashboardBetaPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Check permissions - Admin only
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = profile?.role;

    if (role !== 'admin') {
        // Unauthorized - redirect to regular dashboard
        redirect('/dashboard');
    }

    // Fetch initial data (same as regular dashboard, but using new services in future)
    // For now, use existing dashboard.ts functions
    const period = 'last12months';
    const filters = {};

    const [dashboardData, detailedStats, experimentalData] = await Promise.all([
        getDashboardData(period, filters),
        getDetailedStats(period, filters),
        getExperimentalStats(filters)
    ]);

    return (
        <DashboardBetaClient
            initialData={dashboardData}
            initialDetailedStats={detailedStats}
            initialExperimentalData={experimentalData}
        />
    );
}
