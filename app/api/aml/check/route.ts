import { NextRequest, NextResponse } from 'next/server';
import { AMLService } from '@/lib/aml/services';
import { CompanyConfig } from '@/lib/companyConfig';

export async function POST(req: NextRequest) {
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
