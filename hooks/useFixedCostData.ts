import { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedCost, Division } from '@/lib/types/finance-types';
import { FixedCostService } from '@/lib/services/fixed-cost-service';
import { APP_START_YEAR } from '@/lib/config';

export function useFixedCostData() {
    const [costs, setCosts] = useState<FixedCost[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Date State
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        if (now.getFullYear() < APP_START_YEAR) {
            return new Date(APP_START_YEAR, 0, 1);
        }
        return now;
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { costs: c, divisions: d } = await FixedCostService.fetchMonthlyCosts(
                selectedDate.getFullYear(),
                selectedDate.getMonth() + 1
            );
            setCosts(c);
            setDivisions(d);
        } catch (err: any) {
            setError(err.message || 'Failed to load costs');
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Actions
    const createCost = async (data: Partial<FixedCost>) => {
        setLoading(true);
        try {
            // Ensure rok/mesic from selected date if not present
            const payload = {
                ...data,
                rok: selectedDate.getFullYear(),
                mesic: selectedDate.getMonth() + 1
            };
            await FixedCostService.createCost(payload);
            await loadData();
            return true;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
            return false;
        }
    };

    const updateCost = async (id: number, data: Partial<FixedCost>) => {
        setLoading(true);
        try {
            await FixedCostService.updateCost(id, data);
            await loadData();
            return true;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
            return false;
        }
    };

    const deleteCost = async (id: number) => {
        setLoading(true);
        try {
            await FixedCostService.deleteCost(id);
            await loadData();
            return true;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
            return false;
        }
    };

    const importPreviousMonth = async () => {
        setLoading(true);
        try {
            const count = await FixedCostService.importFromPreviousMonth(selectedDate.getFullYear(), selectedDate.getMonth() + 1);
            if (count > 0) {
                await loadData();
                return true;
            } else {
                setError('V minulém měsíci nebyly nalezeny žádné náklady.');
                return false;
            }
        } catch (err: any) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const changeMonth = (offset: number) => {
        setSelectedDate(current => {
            const newDate = new Date(current);
            newDate.setMonth(newDate.getMonth() + offset);
            if (newDate.getFullYear() < APP_START_YEAR) {
                return new Date(APP_START_YEAR, 0, 1);
            }
            return newDate;
        });
    };

    return {
        costs,
        divisions,
        loading,
        error,
        selectedDate,
        changeMonth,
        createCost,
        updateCost,
        deleteCost,
        importPreviousMonth,
        refresh: loadData
    };
}
