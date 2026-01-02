import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: doc, error } = await supabase
        .from('accounting_documents')
        .select('*')
        .eq('number', '202601')
        .single();

    if (error) {
        return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
        id: doc.id,
        number: doc.number,
        tax_date_col: doc.tax_date,
        raw_data_tax_date: doc.raw_data?.tax_date,
        raw_data_keys: Object.keys(doc.raw_data || {})
    });
}
