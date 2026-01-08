'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function markInvoiceAsPaid(documentId: number, amount: number) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('accounting_documents')
        .update({
            paid_amount: amount,
            manually_paid: true,
            updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

    if (error) {
        console.error('Error marking invoice as paid:', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/accounting/reports/payables');
    return { success: true };
}
