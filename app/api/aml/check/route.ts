import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AMLService } from '@/lib/aml/services';
import { CompanyConfig } from '@/lib/companyConfig';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger({ module: 'API:AMLCheck' });

const amlCheckSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    ico: z.string().optional(),
    dob: z.string().optional(),
    country: z.string().optional(),
});

export async function POST(req: NextRequest) {
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();

    if (!CompanyConfig.features.enableAML) {
        return NextResponse.json({ error: 'AML Module is disabled' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const parsed = amlCheckSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { name, dob, country } = parsed.data;

        const result = await AMLService.checkEntity(name, dob, country);

        log.info('AML check completed', { name, userId: session.user.id });

        return NextResponse.json(result);
    } catch (error) {
        log.error('AML Check Failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
