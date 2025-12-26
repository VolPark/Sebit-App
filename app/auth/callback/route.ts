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
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host');
            const hostHeader = request.headers.get('host');

            // Determine the valid domain to redirect to
            const targetHost = forwardedHost || hostHeader;

            // Determine protocol: prioritize X-Forwarded-Proto, then request protocol
            const forwardedProto = request.headers.get('x-forwarded-proto');
            const currentProtocol = new URL(request.url).protocol.replace(':', '');
            const protocol = forwardedProto || currentProtocol;

            if (targetHost) {
                return NextResponse.redirect(`${protocol}://${targetHost}${next}`);
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
