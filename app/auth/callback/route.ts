import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        console.log('[Auth Callback] Exchanging code for session...');
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development';
            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        } else {
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message || 'Unknown error')}`);
        }
    } else {
        console.warn('[Auth Callback] No code found in URL.');
        return NextResponse.redirect(`${origin}/login?error=No+code+provided`);
    }

    // This should not be reached if code exchange succeeds
    return NextResponse.redirect(`${origin}/login?error=Unknown+error`);
}
