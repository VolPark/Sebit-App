import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const per_page = parseInt(searchParams.get('per_page') || '50');
        const year = searchParams.get('year') || new Date().getFullYear().toString();
        const search = searchParams.get('search') || '';

        const from = (page - 1) * per_page;
        const to = from + per_page - 1;

        let query = supabaseAdmin
            .from('accounting_journal')
            .select('*', { count: 'exact' })
            .eq('fiscal_year', year)
            .order('date', { ascending: false });

        if (search) {
            query = query.or(`text.ilike.%${search}%,account_md.ilike.%${search}%,account_d.ilike.%${search}%`);
        }

        const { data, error, count } = await query.range(from, to);

        if (error) throw error;

        return NextResponse.json({
            items: data,
            meta: {
                page,
                per_page,
                total: count,
                pages: Math.ceil((count || 0) / per_page)
            }
        });
    } catch (e: any) {
        console.error('Error fetching general ledger:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
