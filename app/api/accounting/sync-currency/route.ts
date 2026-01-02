
import { NextRequest, NextResponse } from 'next/server';
import { syncDocumentCurrency } from '@/lib/currency-sync';

// POST /api/accounting/sync-currency
export async function POST(req: NextRequest) {
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
