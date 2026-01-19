
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Current Month target (January if today is Jan)
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

        // 1. Input VAT (MD 343)
        // Exclude internal closings patterns
        const excludedTexts = ['%DP%', '%Úhrada DPH%', '%výstup%', '%vstup%', '%zaokrouhlení%'];

        let queryMd = supabase.from('accounting_journal')
            .select('amount, account_md')
            .ilike('account_md', '343%')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);

        let queryD = supabase.from('accounting_journal')
            .select('amount, account_d')
            .ilike('account_d', '343%')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);

        excludedTexts.forEach(pattern => {
            queryMd = queryMd.not('text', 'ilike', pattern);
            queryD = queryD.not('text', 'ilike', pattern);
        });

        const { data: inputData, error: inputError } = await queryMd;
        if (inputError) throw inputError;

        const { data: outputData, error: outputError } = await queryD;
        if (outputError) throw outputError;

        const inputVat = inputData?.reduce((sum, item) => sum + item.amount, 0) || 0;
        const outputVat = outputData?.reduce((sum, item) => sum + item.amount, 0) || 0;
        const netVat = outputVat - inputVat;

        return NextResponse.json({
            inputVat,
            outputVat,
            netVat,
            period: { start: startOfMonth, end: endOfMonth }
        });

    } catch (error: any) {
        console.error('Error calculating VAT:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
