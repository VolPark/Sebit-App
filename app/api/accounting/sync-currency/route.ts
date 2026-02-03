import { NextRequest, NextResponse } from 'next/server';
import { syncDocumentCurrency } from '@/lib/currency-sync';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';

// POST /api/accounting/sync-currency
export async function POST(req: NextRequest) {
    // Security: Verify user session
    const session = await verifySession(req);
    if (!session) return unauthorizedResponse();

    try {
        const body = await req.json();
        const { docId } = body;

        if (!docId) {
            return NextResponse.json({ error: 'Missing docId' }, { status: 400 });
        }

        await syncDocumentCurrency(docId);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Error syncing currency:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
