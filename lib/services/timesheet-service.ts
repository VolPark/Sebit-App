import { supabase } from '@/lib/supabase';
import { TimesheetEntity, WorkLog, ReportType } from '@/lib/types/timesheet-types';

export const TimesheetService = {
    /**
     * Fetch active entities (Workers or Clients) for a given month.
     */
    async fetchEntities(type: ReportType, month: string): Promise<TimesheetEntity[]> {
        const [year, m] = month.split('-');
        const lastDay = new Date(parseInt(year), parseInt(m), 0).getDate();
        const startDate = `${year}-${m}-01`;
        const endDate = `${year}-${m}-${lastDay}`;

        let entities: TimesheetEntity[] = [];

        if (type === 'worker') {
            const response = await supabase
                .from('prace')
                .select('pracovnici!inner(id, jmeno)')
                .gte('datum', startDate)
                .lte('datum', endDate);

            if (response.data) {
                const map = new Map();
                response.data.forEach((item: any) => {
                    const e = item.pracovnici;
                    if (e && !map.has(e.id)) map.set(e.id, { id: e.id, name: e.jmeno });
                });
                entities = Array.from(map.values());
            }
        } else {
            const response = await supabase
                .from('prace')
                .select('klienti!inner(id, nazev)')
                .gte('datum', startDate)
                .lte('datum', endDate);

            if (response.data) {
                const map = new Map();
                response.data.forEach((item: any) => {
                    // Note: Original code used inner join via akce or direct klienti relation depending on schema availability.
                    // Assuming 'klienti' is joined via 'akce' or direct relation. 
                    // In original code: .select('klienti!inner(id, nazev)') worked on 'prace' directly?
                    // Let's check original code: yes, it used .select('klienti!inner(id, nazev)').
                    // This implies 'prace' has foreign key to 'klienti' or supabase resolves it via 'akce' automatically if unambiguous?
                    // Actually logic used `prace -> klienti` (if FK exists) OR `prace -> akce -> klienti`.
                    // The safe way based on original code is direct or via akce.
                    // Original code used `select('klienti!inner(id, nazev)')`.
                    const e = item.klienti;
                    if (e && !map.has(e.id)) map.set(e.id, { id: e.id, name: e.nazev });
                });
                entities = Array.from(map.values());
            }
        }

        return entities.sort((a, b) => a.name.localeCompare(b.name));
    },

    /**
     * Fetch work logs for a specific entity and month.
     */
    async fetchWorkLogs(type: ReportType, entityId: number, month: string): Promise<WorkLog[]> {
        const [year, m] = month.split('-');
        const lastDay = new Date(parseInt(year), parseInt(m), 0).getDate();
        const startDate = `${year}-${m}-01`;
        const endDate = `${year}-${m}-${lastDay}`;

        let query: any;

        if (type === 'worker') {
            query = supabase
                .from('prace')
                .select(`
                    id, datum, popis, pocet_hodin,
                    akce!inner (
                        nazev,
                        klient_id,
                        klienti ( nazev )
                    )
                `)
                .eq('pracovnik_id', entityId)
                .gte('datum', startDate)
                .lte('datum', endDate)
                .order('datum', { ascending: true });
        } else {
            // Client report
            query = supabase
                .from('prace')
                .select(`
                    id, datum, popis, pocet_hodin,
                    akce!inner (
                        nazev,
                        klient_id
                    ),
                    pracovnici ( jmeno, role )
                `)
                .eq('akce.klient_id', entityId)
                .gte('datum', startDate)
                .lte('datum', endDate)
                .order('datum', { ascending: true });
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((item: any) => ({
            id: item.id,
            date: item.datum,
            project: item.akce?.nazev || 'Bez projektu',
            description: item.popis,
            hours: item.pocet_hodin,
            clientName: item.akce?.klienti?.nazev,
            workerName: item.pracovnici?.jmeno,
            workerRole: item.pracovnici?.role
        }));
    },

    /**
     * Get worker profile for currently logged in user (for Reporter role).
     */
    async getWorkerProfile(userId: string): Promise<{ id: number; name: string } | null> {
        const { data } = await supabase.from('pracovnici').select('id, jmeno').eq('user_id', userId).single();
        if (data) return { id: data.id, name: data.jmeno };
        return null;
    },

    /**
     * Get last active month for a worker (to set default selection).
     */
    async getLastActiveMonth(workerId: number): Promise<string | null> {
        const { data } = await supabase
            .from('prace')
            .select('datum')
            .eq('pracovnik_id', workerId)
            .order('datum', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            const d = new Date(data.datum);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        return null;
    }
};
