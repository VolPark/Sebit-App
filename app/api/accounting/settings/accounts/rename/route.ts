
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use service role for admin access to update provider config
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { code, name } = body;

        if (!code || !name) {
            return NextResponse.json({ error: 'Missing code or name' }, { status: 400 });
        }

        // 1. Fetch current config for 'uol' provider (or make dynamic later)
        const { data: provider, error: fetchError } = await supabaseAdmin
            .from('accounting_providers')
            .select('id, config')
            .eq('code', 'uol')
            .single();

        if (fetchError || !provider) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }

        // 2. Update config
        const config = (provider.config as any) || {};
        const currentNames = config.custom_account_names || {};

        // Merge new name
        const newNames = { ...currentNames, [code]: name };

        // If name is empty, maybe delete? 
        // For now, let's just overwrite.

        const newConfig = { ...config, custom_account_names: newNames };

        // 3. Save
        const { error: updateError } = await supabaseAdmin
            .from('accounting_providers')
            .update({ config: newConfig })
            .eq('id', provider.id);

        if (updateError) {
            throw updateError;
        }

        return NextResponse.json({ success: true, names: newNames });

    } catch (e: any) {
        console.error('Error renaming account:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
