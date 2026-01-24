import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PayrollService } from '@/lib/services/payroll-service';
import { CombinedPayrollRecord, Mzda } from '@/lib/types/payroll-types';

export function usePayrollData() {
    const [data, setData] = useState<CombinedPayrollRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (year: number, month: number) => {
        setLoading(true);
        setError(null);
        try {
            // 0. Fetch current user role (could be optimized with a useUser hook, but keeping it simple here)
            const { data: { user } } = await supabase.auth.getUser();
            let currentUserRole: string | null = null;
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                currentUserRole = profile?.role;
            }

            const result = await PayrollService.getPayrollData(year, month, currentUserRole);
            setData(result);
        } catch (err: any) {
            console.error('Error loading payroll data:', err);
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    const saveRecord = async (record: Partial<Mzda>, year: number, month: number) => {
        try {
            await PayrollService.upsertMzda(record);
            // Refresh data to show updates
            await fetchData(year, month);
            return { success: true };
        } catch (err: any) {
            console.error('Error saving record:', err);
            return { success: false, error: err.message };
        }
    };

    const deleteRecord = async (id: number, year: number, month: number) => {
        try {
            await PayrollService.deleteMzda(id);
            // Refresh data to show updates
            await fetchData(year, month);
            return { success: true };
        } catch (err: any) {
            console.error('Error deleting record:', err);
            return { success: false, error: err.message };
        }
    };

    return {
        data,
        loading,
        error,
        fetchData,
        saveRecord,
        deleteRecord
    };
}
