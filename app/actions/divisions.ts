'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { Division } from '@/lib/types/divisions';

export async function getDivisions(): Promise<Division[]> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .order('id');

    if (error) {
        console.error('Error fetching divisions:', error);
        throw new Error('Failed to fetch divisions');
    }

    return data as Division[];
}

export async function createDivision(name: string): Promise<Division> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from('divisions')
        .insert([{ nazev: name }])
        .select()
        .single();

    if (error) {
        console.error('Error creating division:', error);
        throw new Error('Failed to create division');
    }

    revalidatePath('/administrace');
    return data as Division;
}

export async function updateDivision(id: number, name: string): Promise<void> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('divisions')
        .update({ nazev: name })
        .eq('id', id);

    if (error) {
        console.error('Error updating division:', error);
        throw new Error('Failed to update division');
    }

    revalidatePath('/administrace');
}

export async function deleteDivision(id: number): Promise<void> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('divisions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting division:', error);
        throw new Error('Failed to delete division');
    }

    revalidatePath('/administrace');
}
