import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    const response = await updateSession(request)

    // Create a Supabase client for the middleware to access user data
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    request.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: any) {
                    request.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    console.log('[Middleware] Path:', request.nextUrl.pathname, '| User:', user?.email || 'No user', '| Cookies:', request.cookies.getAll().map(c => c.name).join(', '));

    // Protected Routes Logic

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sw.js, manifest.json (static assets)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
