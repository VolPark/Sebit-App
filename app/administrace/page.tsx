import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import UserManagement from './UserManagement';
import { getUsers, UserData } from '@/app/actions/user-management';

export default async function AdministracePage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Check permissions
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = profile?.role;

    if (role !== 'owner' && role !== 'admin') {
        // Unauthorized
        redirect('/dashboard');
    }

    // Fetch users (Server Side)
    let users: UserData[] = [];
    try {
        users = await getUsers();
    } catch (error) {
        console.error('Failed to fetch users:', error);
        // We can render the page with empty list or error message
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Administrace</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Správa uživatelů, rolí a přístupů.
                </p>
            </div>

            <UserManagement initialUsers={users} />
        </div>
    );
}
