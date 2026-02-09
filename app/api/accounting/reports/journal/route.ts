import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';
import { parseYearParam } from '@/lib/api/schemas';

import { getErrorMessage } from '@/lib/errors';
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Security: Verify user session
    const session = await verifySession(req);
    if (!session) {
        return unauthorizedResponse();
    }

    try {
        const { searchParams } = new URL(req.url);
        const yearResult = parseYearParam(searchParams);
        if (yearResult instanceof NextResponse) return yearResult;
        const { year } = yearResult;

        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const { data: entries, error } = await supabaseAdmin
            .from('accounting_journal')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true }) // Primary sort: Date
            .order('id', { ascending: true });  // Secondary sort: Insertion order

        if (error) throw error;

        return NextResponse.json({
            items: entries || [],
            meta: {
                year,
                totalCount: entries?.length || 0
            }
        });

    } catch (e: unknown) {
        console.error('Error fetching journal:', e);
        return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
    }
}
