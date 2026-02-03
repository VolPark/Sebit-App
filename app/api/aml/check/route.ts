import { NextRequest, NextResponse } from 'next/server';
import { AMLService } from '@/lib/aml/services';
import { CompanyConfig } from '@/lib/companyConfig';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
    // Security: Verify user session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Feature Flag Check
    if (!CompanyConfig.features.enableAML) {
        return NextResponse.json({ error: 'AML Module is disabled' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, ico, dob, country } = body; // Updated inputs

        if (!name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
        }

        // Perform Check
        const result = await AMLService.checkEntity(name, dob, country);

        // In a real implementation, we would save this to DB (aml_checks table) here.
        // await db.saveCheck(...)

        return NextResponse.json(result);

    } catch (error) {
        console.error('AML Check Failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
