import { createClient as createBrowserClient } from '@/utils/supabase/client'
import { createClient as createVanillaClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Export a robust client that works on both client (Cookie/SSR compatible) and server (Vanilla)
export const supabase = typeof window !== 'undefined'
    ? createBrowserClient()
    : createVanillaClient(supabaseUrl, supabaseKey)