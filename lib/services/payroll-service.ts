import { supabase } from '@/lib/supabase';
import { CombinedPayrollRecord, Mzda, PayrollFilter, Pracovnik, WorkerRoleProfile } from '@/lib/types/payroll-types';

export const PayrollService = {
    /**
     * Fetches all necessary data to construct the payroll view.
     * Handles joining workers, salaries, and accounting costs.
     * Applies security filtering for 'office' role.
     */
    async getPayrollData(
        year: number,
        month: number,
        currentUserRole: string | null
    ): Promise<CombinedPayrollRecord[]> {
        // 1. Fetch all workers
        const { data: allPracovnici, error: pracError } = await supabase
            .from('pracovnici')
            .select('*')
            .order('jmeno');

        if (pracError) throw new Error(`Error fetching workers: ${pracError.message}`);

        // 2. Fetch all salaries for selected month
        const { data: monthlyMzdy, error: mzdyError } = await supabase
            .from('mzdy')
            .select('*')
            .eq('rok', year)
            .eq('mesic', month);

        if (mzdyError) throw new Error(`Error fetching salaries: ${mzdyError.message}`);

        // 3. Fetch mapped costs
        // Only fetch costs where the document issue_date falls within the selected month
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0];
        const endOfMonth = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0];

        // Note: supabase-js types for joined queries can be tricky, using any for the intermediate result if needed
        const { data: mappedCosts, error: costsError } = await supabase
            .from('accounting_mappings')
            .select(`
                amount,
                pracovnik_id,
                accounting_documents!inner (
                    issue_date
                )
             `)
            .not('pracovnik_id', 'is', null)
            .gte('accounting_documents.issue_date', startOfMonth)
            .lte('accounting_documents.issue_date', endOfMonth);

        if (costsError) throw new Error(`Error fetching mapped costs: ${costsError.message}`);

        // 4. Fetch roles for workers (Security: Office cannot see Owners)
        const userIds = allPracovnici
            .map((p: any) => p.user_id)
            .filter((id: any) => id !== null) as string[];

        const workerRolesMap = new Map<string, string>();
        if (userIds.length > 0) {
            const { data: profiles } = await supabase.rpc('get_profiles_roles', { user_ids: userIds });
            if (profiles) {
                profiles.forEach((p: WorkerRoleProfile) => workerRolesMap.set(p.id, p.role));
            }
        }

        // 5. Process Costs Map
        const costsMap = new Map<number, number>();
        if (mappedCosts) {
            mappedCosts.forEach((item: any) => {
                const pid = item.pracovnik_id;
                const amount = Number(item.amount) || 0;
                costsMap.set(pid, (costsMap.get(pid) || 0) + amount);
            });
        }

        // 6. Combine Data
        const mzdyMap = new Map<number, Mzda>(monthlyMzdy.map((m: any) => [m.pracovnik_id, m]));

        const combinedData: CombinedPayrollRecord[] = allPracovnici.map((p: any) => {
            const mzda = mzdyMap.get(p.id) || null;
            const mappedCost = costsMap.get(p.id) || 0;
            // Total cost = salary record total + mapped external costs
            // If mzda is null, totalWithCost is just mappedCost
            const totalWithCost = (mzda?.celkova_castka || 0) + mappedCost;

            return {
                id: p.id,
                jmeno: p.jmeno,
                hodinova_mzda: p.hodinova_mzda,
                telefon: p.telefon,
                is_active: p.is_active,
                organization_id: p.organization_id,
                user_id: p.user_id,
                mzda,
                mappedCost,
                totalWithCost,
                canEdit: p.is_active // Simple helper, UI might refine this
            };
        });

        // 7. Filter
        return combinedData.filter(p => {
            // Rule 1: Show if active OR has money (salary or mapped costs)
            const isActiveOrHasMoney = p.is_active || p.mzda !== null || p.mappedCost > 0;
            if (!isActiveOrHasMoney) return false;

            // Rule 2: Office role cannot see Owners
            if (currentUserRole === 'office') {
                const workerRole = p.user_id ? workerRolesMap.get(p.user_id) : null;
                if (workerRole === 'owner') return false;
            }

            return true;
        });
    },

    /**
     * Updates or inserts a salary record.
     */
    async upsertMzda(record: Partial<Mzda>): Promise<void> {
        // Validation could go here
        const { error } = await supabase
            .from('mzdy')
            .upsert(record, { onConflict: 'pracovnik_id,rok,mesic' });

        if (error) throw new Error(`Error saving salary: ${error.message}`);
    },

    /**
     * Deletes a salary record by ID.
     */
    async deleteMzda(id: number): Promise<void> {
        const { error } = await supabase
            .from('mzdy')
            .delete()
            .eq('id', id);

        if (error) throw new Error(`Error deleting salary: ${error.message}`);
    }
};
