import { NextRequest, NextResponse } from 'next/server';
import { EUSanctionsService } from '@/lib/aml/sanctions/eu';
import { CompanyConfig } from '@/lib/companyConfig';

export async function POST(req: NextRequest) {
    if (!CompanyConfig.features.enableAML) {
        return NextResponse.json({ error: 'AML Module Disabled' }, { status: 403 });
    }

    try {
        // Fetch
        const xmlData = await EUSanctionsService.fetchList();

        // Parse & Save
        const count = await EUSanctionsService.parseAndSave(xmlData);

        return NextResponse.json({
            success: true,
            message: `Successfully updated ${count} entities from EU Sanctions List.`
        });
    } catch (error: any) {
        console.error('EU Sanctions Update Failed:', error);
        return NextResponse.json({
            error: error.message || 'Update failed'
        }, { status: 500 });
    }
}
