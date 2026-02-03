import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/**
 * Verify user session from cookies or Authorization header
 * Supports both:
 * - Cookie-based sessions (frontend fetch requests)
 * - Bearer token auth (API clients, mobile apps)
 * 
 * Returns user object if valid, null otherwise
 */
export async function verifySession(req: NextRequest): Promise<{ user: any } | null> {
    // Method 1: Try Bearer token first (for API clients)
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
            return { user };
        }
    }

    // Method 2: Cookie-based session (for frontend fetch)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    // Parse cookies from request
                    const cookieHeader = req.headers.get('cookie') || '';
                    const cookies: { name: string; value: string }[] = [];
                    cookieHeader.split(';').forEach(cookie => {
                        const [name, ...rest] = cookie.trim().split('=');
                        if (name) {
                            cookies.push({ name, value: rest.join('=') });
                        }
                    });
                    return cookies;
                },
                setAll(cookiesToSet) {
                    // No-op for read-only verification
                },
            },
        }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
        return { user };
    }

    return null;
}

/**
 * Unauthorized response helper
 */
export function unauthorizedResponse(): NextResponse {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
