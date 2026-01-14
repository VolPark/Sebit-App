import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getFilteredNavigation } from '@/lib/app-navigation';

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;

  // Get available navigation for this role
  const navigation = getFilteredNavigation(role);

  // Find first available route
  // We look for the first group that has items, and take the first item's href
  let targetPath = '/dashboard'; // Fallback

  for (const group of navigation) {
    if (group.items && group.items.length > 0) {
      targetPath = group.items[0].href;
      break;
    }
  }

  redirect(targetPath);
}