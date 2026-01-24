import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, TransactionFilters, Division } from '@/lib/types/finance-types';
import { TransactionService } from '@/lib/services/transaction-service';

export function useFinanceData(initialFilters?: TransactionFilters) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [projects, setProjects] = useState<any[]>([]); // simplified type
    const [clients, setClients] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<TransactionFilters>(initialFilters || { divisionId: null });

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { transactions: t, divisions: d, projects: p, clients: c } = await TransactionService.fetchTransactions(filters);
            setTransactions(t);
            setDivisions(d);
            setProjects(p);
            setClients(c);
        } catch (err: any) {
            setError(err.message || 'Failed to load finance data');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const createTransaction = async (data: Partial<Transaction>) => {
        setLoading(true);
        try {
            await TransactionService.createTransaction(data);
            await loadAll();
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to create transaction');
            setLoading(false);
            return false;
        }
    };

    const updateTransaction = async (id: number, data: Partial<Transaction>) => {
        setLoading(true);
        try {
            await TransactionService.updateTransaction(id, data);
            await loadAll();
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to update transaction');
            setLoading(false);
            return false;
        }
    };

    const deleteTransaction = async (id: number) => {
        if (!confirm('Opravdu smazat?')) return false;
        setLoading(true);
        try {
            await TransactionService.deleteTransaction(id);
            await loadAll();
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to delete transaction');
            setLoading(false);
            return false;
        }
    };

    const stats = useMemo(() => {
        let income = 0;
        let expense = 0;
        transactions.forEach(t => {
            const val = Number(t.castka) || 0;
            if (t.typ === 'Příjem') income += val;
            if (t.typ === 'Výdej') expense += val;
        });
        return { income, expense, balance: income - expense };
    }, [transactions]);

    return {
        transactions,
        divisions,
        projects,
        clients,
        loading,
        error,
        filters,
        setFilters,
        stats,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        refresh: loadAll
    };
}
