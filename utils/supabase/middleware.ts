import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // OPTIMIZATION: Skip getUser() for prefetch requests to prevent Supabase API spam
    const purpose = request.headers.get('purpose');
    const isPrefetch = purpose === 'prefetch' || request.headers.get('next-router-prefetch');

    if (isPrefetch) {
        return response;
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected Routes Logic
    // If no user and accessing protected route -> redirect to login
    // EXCLUDE /api routes from this check (handled by API auth or cron secrets)
    if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth') && !request.nextUrl.pathname.startsWith('/api')) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If user exists and is on /login -> redirect to /dashboard
    // FIX: Check for logout param to allow optimistic signout navigation
    const isLogout = request.nextUrl.searchParams.get('logout') === 'true';
    if (user && request.nextUrl.pathname.startsWith('/login') && !isLogout) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return response
}
