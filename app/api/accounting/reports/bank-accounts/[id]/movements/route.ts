import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();

    try {
        const { id } = await params;

        // Fetch from DB Cache
        // This effectively filters by account ID correctly and is instant
        const { data: movements, error } = await supabaseAdmin
            .from('accounting_bank_movements')
            .select('*')
            .eq('bank_account_id', id)
            .order('date', { ascending: false });

        if (error) {
            throw error;
        }

        // Map to expected structure if needed, or return as is.
        // Frontend expects { items: [...] }
        // DB columns: id, date, amount, description, variable_symbol...
        // Frontend component expects: amount, date, note, variable_symbol. 
        // We stored 'description' in DB, frontend looks for 'note'.

        const mappedItems = (movements || []).map(m => ({
            bank_movement_id: m.movement_id,
            amount: m.amount,
            currency: m.currency, // or object { currency_id: ... }
            date: m.date,
            note: m.description,
            variable_symbol: m.variable_symbol,
            // items: [{ date: m.date }] // fallback for detail logic in frontend
            items: [{ date: m.date, note: m.description }],
            created_at: m.created_at
        }));

        return NextResponse.json({ items: mappedItems });
    } catch (e: any) {
        console.error('Error fetching bank movements from DB:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
