import { createClient } from '@supabase/supabase-js'

export const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
    }

    if (!serviceRoleKey) {
        console.error('SUPABASE_SERVICE_ROLE_KEY is missing. Make sure it is set in .env.local and server is restarted.');
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
    }

    return createClient(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
