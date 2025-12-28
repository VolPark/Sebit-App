import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import UserManagement from './UserManagement';
import DivisionsManagement from './DivisionsManagement'; // Import new component
import { getUsers, UserData } from '@/app/actions/user-management';
import { getDivisions } from '@/app/actions/divisions'; // Import divisions action
import ClientAdminTabs from './ClientAdminTabs'; // We'll move the client-side tab logic here or inline it if simple. 
// Actually, since this is a server component, I cannot use useState here. 
// I should wrap the content in a client component or pass both data to a client wrapper.
// Let's create `ClientAdminTabs` to handle the tab switching.

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

    // Fetch data (Parallel)
    const [users, divisions] = await Promise.all([
        getUsers().catch(err => { console.error(err); return []; }),
        getDivisions().catch(err => { console.error(err); return []; })
    ]);

    return (
        <ClientAdminTabs users={users} divisions={divisions} />
    );
}
