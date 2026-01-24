import { supabase } from '@/lib/supabase';
import { Transaction, TransactionFilters, Division } from '@/lib/types/finance-types';

export const TransactionService = {
    /**
     * Fetch transactions with optional filtering.
     */
    async fetchTransactions(filters: TransactionFilters = {}): Promise<{
        transactions: Transaction[],
        divisions: Division[],
        projects: { id: number, nazev: string, klient_id?: number }[],
        clients: { id: number, nazev: string, ico?: string }[]
    }> {
        let query = supabase
            .from('finance')
            .select('*, divisions(id, nazev), akce(id, nazev, klient_id)')
            .order('datum', { ascending: false });

        if (filters.divisionId) {
            query = query.eq('division_id', filters.divisionId);
        }

        const [tRes, dRes, aRes, cRes] = await Promise.all([
            query,
            supabase.from('divisions').select('id, nazev').order('id'),
            supabase.from('akce').select('id, nazev, klient_id').in('project_type', ['SERVICE', 'TM']).order('nazev'),
            supabase.from('klienti').select('id, nazev, ico').order('nazev')
        ]);

        if (tRes.error) throw tRes.error;

        return {
            transactions: (tRes.data || []) as unknown as Transaction[],
            divisions: (dRes.data || []) as Division[],
            projects: (aRes.data || []) as { id: number, nazev: string, klient_id?: number }[],
            clients: (cRes.data || []) as { id: number, nazev: string, ico?: string }[]
        };
    },

    async createTransaction(data: Partial<Transaction>): Promise<void> {
        const { id, divisions, akce, created_at, ...payload } = data as any;
        const { error } = await supabase.from('finance').insert(payload);
        if (error) throw error;
    },

    async updateTransaction(id: number, data: Partial<Transaction>): Promise<void> {
        const { id: _id, divisions, akce, created_at, ...payload } = data as any;
        const { error } = await supabase.from('finance').update(payload).eq('id', id);
        if (error) throw error;
    },

    async deleteTransaction(id: number): Promise<void> {
        const { error } = await supabase.from('finance').delete().eq('id', id);
        if (error) throw error;
    }
};
