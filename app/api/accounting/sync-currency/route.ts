import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { syncDocumentCurrency } from '@/lib/currency-sync';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

const syncCurrencySchema = z.object({
    docId: z.coerce.number({ message: 'docId must be a number' }),
});

// POST /api/accounting/sync-currency
export async function POST(req: NextRequest) {
    // Security: Verify user session
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();

    try {
        const body = await req.json();
        const parsed = syncCurrencySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { docId } = parsed.data;

        await syncDocumentCurrency(docId);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Error syncing currency:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
