import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TimesheetService } from '@/lib/services/timesheet-service';
import { TimesheetEntity, WorkLog, ReportType } from '@/lib/types/timesheet-types';

export function useTimesheetData() {
    const [reportType, setReportType] = useState<ReportType>('worker');
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Date().toISOString().slice(0, 7) // YYYY-MM
    );
    const [selectedEntityId, setSelectedEntityId] = useState<string>('');
    const [entities, setEntities] = useState<TimesheetEntity[]>([]);
    const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Reporter Logic
    const [isReporter, setIsReporter] = useState(false);
    const [reporterWorkerId, setReporterWorkerId] = useState<number | null>(null);

    // Initial load - check user role
    useEffect(() => {
        const initReporter = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (profile?.role === 'reporter') {
                setIsReporter(true);
                const worker = await TimesheetService.getWorkerProfile(user.id);

                if (worker) {
                    setReporterWorkerId(worker.id);
                    setReportType('worker');
                    setSelectedEntityId(worker.id.toString());

                    // Try to set month to last active
                    const lastMonth = await TimesheetService.getLastActiveMonth(worker.id);
                    if (lastMonth) setSelectedMonth(lastMonth);
                }
            }
        };
        initReporter();
    }, []);

    // Load available Entities (dropdown) depending on month/type
    useEffect(() => {
        const loadEntities = async () => {
            // If reporter, lock to self
            if (isReporter && reporterWorkerId) {
                const worker = await TimesheetService.getWorkerProfile((await supabase.auth.getUser()).data.user?.id!); // re-fetch name or use stored if optimized
                if (worker) setEntities([{ id: worker.id, name: worker.name }]);
                return;
            }

            try {
                const data = await TimesheetService.fetchEntities(reportType, selectedMonth);
                setEntities(data);

                // If switching types, clear selection unless ID happens to exist (unlikely)
                // We deliberately clear execution to avoid confusion.
                // But this effect runs on date change too.
                // Logic: Only clear if current ID is not in new list?
                // For simplicity, we trust the user to re-select if needed, mostly handled by UI value binding.
            } catch (err) {
                console.error(err);
            }
        };
        loadEntities();
    }, [reportType, selectedMonth, isReporter, reporterWorkerId]);

    // Clear selection when report type changes (if not reporter)
    useEffect(() => {
        if (!isReporter) {
            setSelectedEntityId('');
        }
    }, [reportType, isReporter]);

    // Fetch Logs when selection is ready
    useEffect(() => {
        if (!selectedEntityId || !selectedMonth) {
            setWorkLogs([]);
            return;
        }

        const loadLogs = async () => {
            setLoading(true);
            try {
                const logs = await TimesheetService.fetchWorkLogs(reportType, Number(selectedEntityId), selectedMonth);
                setWorkLogs(logs);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadLogs();
    }, [selectedEntityId, selectedMonth, reportType]);

    return {
        reportType,
        setReportType,
        selectedMonth,
        setSelectedMonth,
        selectedEntityId,
        setSelectedEntityId,
        entities,
        workLogs,
        loading,
        isReporter // exposed for UI disabling
    };
}
