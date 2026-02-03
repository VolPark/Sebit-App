// This debug endpoint has been removed for security reasons
// If you need to debug tax dates, use the accounting reports or logging instead

import { NextResponse } from 'next/server';

export async function GET() {
    // Security: Debug endpoints are disabled in production
    return NextResponse.json({
        error: 'Not found',
        message: 'Debug endpoints are disabled'
    }, { status: 404 });
}
