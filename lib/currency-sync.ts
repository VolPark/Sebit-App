
import { supabase } from '@/lib/supabase';
import { getExchangeRate } from '@/lib/currency';

export async function syncDocumentCurrency(docId: number) {
    // 1. Fetch Document
    const { data: doc, error } = await supabase
        .from('accounting_documents')
        .select('id, issue_date, currency, amount')
        .eq('id', docId)
        .single();
    //aa
    if (error || !doc) return;
    if (doc.currency === 'CZK') {
        // Just set amount_czk = amount
        await supabase.from('accounting_documents').update({
            amount_czk: doc.amount,
            exchange_rate: 1
        }).eq('id', docId);

        // Update mappings
        // This is tricky for mappings if they are partial? 
        // We update mappings by multiplying their amount by 1.
        // Actually, better to run a calculated update.
        await updateMappingsCzk(docId, 1);
        return;
    }

    // 2. Foreign Currency
    const rate = await getExchangeRate(doc.issue_date, doc.currency);
    if (!rate) return;

    // 3. Update Document
    const amountCzk = doc.amount * rate;
    await supabase.from('accounting_documents').update({
        amount_czk: amountCzk,
        exchange_rate: rate
    }).eq('id', docId);

    // 4. Update Mappings
    await updateMappingsCzk(docId, rate);
}

async function updateMappingsCzk(docId: number, rate: number) {
    const { data: mappings } = await supabase
        .from('accounting_mappings')
        .select('id, amount')
        .eq('document_id', docId);

    if (mappings && mappings.length > 0) {
        for (const m of mappings) {
            const czkVal = Number(m.amount) * rate; // m.amount is mapped portion in original currency
            await supabase
                .from('accounting_mappings')
                .update({ amount_czk: czkVal })
                .eq('id', m.id);
        }
    }
}
