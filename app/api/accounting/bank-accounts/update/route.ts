import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    // Security: Verify user session
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();

    try {
        const body = await req.json();
        const { bank_account_id, custom_name } = body;

        if (!bank_account_id) {
            return NextResponse.json({ error: 'Missing bank_account_id' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('accounting_bank_accounts')
            .upsert({
                bank_account_id,
                custom_name,
                updated_at: new Date().toISOString()
            }, { onConflict: 'bank_account_id' });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Error updating bank account name:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
