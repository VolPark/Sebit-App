import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

const updateBankAccountSchema = z.object({
    bank_account_id: z.string().min(1, 'bank_account_id is required'),
    custom_name: z.string().optional(),
});

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
        const parsed = updateBankAccountSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { bank_account_id, custom_name } = parsed.data;

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
