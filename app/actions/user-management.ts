'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'

export type UserData = {
    id: string
    email?: string
    name?: string
    role: string
    providers?: string[]
    created_at: string
    last_sign_in_at?: string
}

export async function getUsers(): Promise<UserData[]> {
    noStore()
    const supabase = createAdminClient()

    // 1. Get all users from auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
        console.error('Error fetching users:', authError)
        throw new Error('Nepodařilo se načíst uživatele')
    }

    // 2. Get roles from profiles
    // We try to fetch profiles. If table doesn't exist, this might fail.
    // Assuming profiles table exists as per page.tsx usage.
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')

    // If we can't fetch profiles, we fall back to empty roles or check organization_members
    // But let's assume profiles is key.

    // Also fetch organization_members just in case profiles is incomplete
    if (profileError) console.error('Error fetching profiles:', profileError)

    const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select('user_id, role')

    const userList = users.map(user => {
        const profile = profiles?.find((p: any) => p.id === user.id)
        const orgMember = orgMembers?.find((m: any) => m.user_id === user.id)

        // Prefer profile role, then orgMember role, then 'member'
        const role = profile?.role || orgMember?.role || 'member'
        const name = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || 'Neznámý'

        // Extract providers
        const providers = user.app_metadata.providers || []

        return {
            id: user.id,
            email: user.email,
            name: name,
            role: role,
            providers: providers,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at
        }
    })

    return userList
}

export async function updateUserRole(userId: string, newRole: string) {
    const supabase = createAdminClient()

    // Update profiles
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: userId, role: newRole })

    if (profileError) {
        console.error('Error updating profile role:', profileError)
        // Don't throw depending on if profiles is a view
    }

    // Update organization_members (This is likely the single source of truth for RLS)
    // We first check if a member record exists
    const { data: member } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', userId)
        .single()

    if (member) {
        await supabase
            .from('organization_members')
            .update({ role: newRole })
            .eq('user_id', userId)
    } else {
        // Insert if missing - we need organization_id. 
        // We'll pick the first organization found or a default one?
        // Ideally we should know the organization. 
        // For now, let's assume one organization or skip.
        const { data: orgs } = await supabase.from('organizations').select('id').limit(1).single()
        if (orgs) {
            await supabase.from('organization_members').insert({
                user_id: userId,
                organization_id: orgs.id,
                role: newRole
            })
        }
    }

    revalidatePath('/administrace')
}

export async function inviteUser(email: string, role: string) {
    const supabase = createAdminClient()

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/update-password`
    })

    if (error) {
        console.error('Error inviting user:', error)
        throw new Error(error.message)
    }

    if (data.user) {
        await updateUserRole(data.user.id, role)
    }

    revalidatePath('/administrace')
}

export async function deleteUser(userId: string) {
    const supabase = createAdminClient()

    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/administrace')
}

export async function updateUserName(userId: string, newName: string) {
    const supabase = createAdminClient()

    // 1. Update Profile (Primary Source)
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: userId, full_name: newName })

    if (profileError) {
        console.error('Error updating profile name:', profileError)
        throw new Error('Nepodařilo se aktualizovat jméno v profilu')
    }

    // 2. Update Auth Metadata (Fallback)
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { full_name: newName }
    })

    if (authError) {
        console.error('Error updating auth metadata:', authError)
    }

    revalidatePath('/administrace')
}
